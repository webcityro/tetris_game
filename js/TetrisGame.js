export default class TetrisGame {
	#cssClasses = {
		grid: '',
		cell: '',
		usedCell: '',
		tetraminos: {
			i: '',
			j: '',
			l: '',
			o: '',
			s: '',
			t: '',
			z: '',
		},
	};
	#gameField = {
		columns: 12,
		rows: 20,
		grid: [],
		element: null,
	};
	#queue = {
		grid: [],
		tetraminos: [],
		element: null,
		elements: [],
		size: 3,
	};
	#hold = {
		grid: [],
		tetramino: [],
		element: null,
	};
	#tetraminos = {
		i: {
			name: 'i',
			metrix: [
				[1, 0, 0, 0],
				[1, 0, 0, 0],
				[1, 0, 0, 0],
				[1, 0, 0, 0],
			],
		},
		j: {
			name: 'j',
			metrix: [
				[0, 0, 1],
				[0, 0, 1],
				[0, 1, 1],
			],
		},
		l: {
			name: 'l',
			metrix: [
				[1, 0, 0],
				[1, 0, 0],
				[1, 1, 0],
			],
		},
		o: {
			name: 'o',
			metrix: [
				[1, 1],
				[1, 1],
			],
		},
		s: {
			name: 's',
			metrix: [
				[0, 1, 1],
				[1, 1, 0],
				[0, 0, 0],
			],
		},
		t: {
			name: 't',
			metrix: [
				[1, 1, 1],
				[0, 1, 0],
				[0, 0, 0],
			],
		},
		z: {
			name: 'z',
			metrix: [
				[1, 1, 0],
				[0, 1, 1],
				[0, 0, 0],
			],
		},
	};
	#score;
	#player;
	#status = 'pending';
	#lastMoveTime = 0;
	#animationFrame;
	#events = {
		ready: [],
		start: [],
		pause: [],
		resume: [],
		moveDown: [],
		moveHorizontally: [],
		hardDrop: [],
		rotate: [],
		bottomReached: [],
		newTetramino: [],
		holdSwap: [],
		scoreChange: [],
		gameOver: [],
	};

	constructor({ gameField, queue, hold, cssClasses }) {
		try {
			this.#validateConstructorParam(gameField, 'gameField');
			this.#validateConstructorParam(gameField.element, 'gameField.element');
			this.#validateConstructorParam(queue, 'queue');
			this.#validateConstructorParam(hold, 'hold');
			this.#validateConstructorParam(cssClasses, 'cssClasses');

			for (const key in this.#cssClasses) {
				this.#validateConstructorParam(cssClasses[key], 'cssClasses.' + key);
			}

			for (const key in this.#cssClasses.tetraminos) {
				this.#validateConstructorParam(
					cssClasses.tetraminos[key],
					'cssClasses.tetraminos.' + key
				);
			}
		} catch (error) {
			console.error(error);
		}

		this.#gameField = {
			...this.gameField,
			...gameField,
		};
		this.#queue.element = queue;
		this.#hold.element = hold;
		this.#cssClasses = {
			...this.#cssClasses,
			...cssClasses,
			tetraminos: {
				...this.#cssClasses.tetraminos,
				...(cssClasses?.tetraminos || {}),
			},
		};
	}

	availableEvents() {
		return Object.keys(this.#events);
	}

	init() {
		this.#createGrid(this.#gameField);
		this.#scoreInit();
		this.#queueInit();
		this.#queueReset();
		this.#holdReset();
		this.#playerReset();

		this.#status = 'ready';
		this.#emit('ready');
	}

	hardDrop() {
		this.#undrawTetramono();

		do {
			this.#player.y++;
		} while (!this.#collection());

		this.#player.y--;

		this.#draw();
		this.#emit('hardDrop', { ...this.#player });
	}

	holdSwap() {
		this.#undrawTetramono();
		const holdTetramono = this.#hold.tetramino.metrix
			? { ...this.#hold.tetramino }
			: this.#randomTetramono();

		this.#hold.tetramino = JSON.parse(
			JSON.stringify({
				...this.#tetraminos[this.#player.tetramino.name],
			})
		);
		this.#hold.element.innerHTML = '';
		const { width, height } = this.#tetraminoSize(this.#hold.tetramino);

		this.#hold.grid = this.#createGrid({
			...this.#hold,
			columns: width,
			rows: height,
		});

		this.#drawTetramono(
			this.#removePaddingCells(this.#hold.tetramino),
			{ y: 0, x: 0 },
			this.#hold.grid
		);
		this.#playerReset(holdTetramono);
	}

	moveDown() {
		if (this.#status !== 'playing') return;

		return new Promise((resolve, reject) => {
			this.#undrawTetramono();
			this.#player.y++;

			if (this.#collection()) {
				this.#player.y--;
				this.#draw();
				return this.#bottomReached()
					.then(resolve)
					.catch((rowsRemoved) => {
						this.#draw();
						reject(rowsRemoved);
					});
			}
			this.#draw();
			this.#emit('moveDown', { ...this.#player });
			resolve();
		});
	}

	moveHorizontally(x) {
		if (this.#status !== 'playing') return;

		this.#undrawTetramono();
		this.#player.x += x;

		if (this.#collection()) this.#player.x -= x;
		this.#draw();
		this.#emit('moveHorizontally', { ...this.#player });
	}

	on(event, callback) {
		if (!this.availableEvents().includes(event)) {
			return console.error(
				'TetrisGame: Unsupported event "' +
					event +
					'". Events available: "' +
					this.availableEvents().join(', ') +
					'.'
			);
		}

		this.#events[event].push(callback);

		return this;
	}

	pause() {
		this.#status = 'paused';
		cancelAnimationFrame(this.#animationFrame);
		this.#emit('pause');
	}

	playerRotate(direction) {
		if (this.#status !== 'playing') return;

		const initialX = this.#player.x;
		let offset = 1;

		this.#undrawTetramono();
		this.#rotate(direction);

		while (this.#collection()) {
			this.#player.x += offset;
			offset = -(offset + (offset > 0 ? 1 : -1));

			if (
				offset >
				Math.max(
					this.#player.tetramino.metrix.length,
					this.#player.tetramino.metrix[0].length
				)
			) {
				this.#rotate(-direction);
				this.#player.x = initialX;
				break;
			}
		}

		this.#draw();
		this.#emit('rotate', { ...this.#player });
	}

	async restart() {
		this.init();
		await this.start();
	}

	resume() {
		this.#status = 'playing';
		this.#update();
		this.#emit('resume');
	}

	async start() {
		this.#status = 'playing';
		this.#draw();

		setTimeout(async () => await this.#update(), this.#moveInterval());

		this.#emit('start');
	}

	status() {
		return this.#status;
	}

	async #bottomReached() {
		return new Promise((resolve, reject) => {
			this.#removeFullRows()
				.then((rowsRemoved) => {
					this.#scoreChange(rowsRemoved);
					this.#emit('bottomReached', { ...this.#player });
					this.#playerReset();

					if (this.#collection()) {
						this.#gameOver();
						reject(0);
					} else resolve(rowsRemoved);
				})
				.catch(console.error);
		});
	}

	#collection() {
		const grid = this.#gameField.grid;

		return this.#player.tetramino.metrix.some((row, y) =>
			row.some(
				(used, x) =>
					used &&
					(!grid[this.#player.y + y] ||
						!grid[this.#player.y + y][this.#player.x + x] ||
						grid[this.#player.y + y][this.#player.x + x].taken)
			)
		);
	}

	#createGrid(gridObj, index) {
		const grid = [];
		const element =
			typeof index === 'undefined' ? gridObj.element : gridObj.elements[index];
		element.style.setProperty('--columns', gridObj.columns);
		element.style.setProperty('--rows', gridObj.rows);
		element.innerHTML = '';

		for (let y = 0; y < gridObj.rows; y++) {
			const row = [];

			for (let x = 0; x < gridObj.columns; x++) {
				const cell = document.createElement('div');
				cell.classList.add(this.#cssClasses.cell);
				row.push({ element: cell, taken: false });
				element.appendChild(cell);
			}

			grid.push(row);
		}

		if (typeof index !== 'undefined') gridObj.grid[index] = grid;
		else gridObj.grid = grid;

		return grid;
	}

	#createGridWrapper() {
		const div = document.createElement('div');
		div.classList.add(this.#cssClasses.grid);
		return div;
	}

	#draw() {
		this.#drawTetramono(
			this.#player.tetramino,
			{ x: this.#player.x, y: this.#player.y },
			this.#gameField.grid
		);
	}

	#drawTetramono(tetramino, offset, grid) {
		tetramino.metrix.forEach((row, y) =>
			row.forEach((used, x) => {
				if (!used) return;

				grid[offset.y + y][offset.x + x].element.classList.add(
					this.#cssClasses.usedCell,
					this.#cssClasses.tetraminos[tetramino.name]
				);
				grid[offset.y + y][offset.x + x].taken = true;
			})
		);

		return grid;
	}

	#emit(event, ...args) {
		this.#events[event].forEach((callback) => callback(...args));
	}

	#gameOver() {
		this.#status = 'over';
		cancelAnimationFrame(this.#animationFrame);
		this.#emit('gameOver', { ...this.#score });
	}

	#holdReset() {
		this.#hold.tetramino = [];
		this.#hold.grid = [];
		this.#hold.element.innerHTML = '';
	}

	#moveInterval() {
		const milliseconds = 1100 - this.#score.level * 100;
		return milliseconds > 100 ? milliseconds : 100; // milliseconds
	}

	#nextTetramino() {
		const tetramino = this.#queue.tetraminos.shift();
		this.#queue.tetraminos.push(this.#randomTetramono());
		this.#queueReset();
		this.#queueDraw();
		return tetramino;
	}

	#playerReset(tetramino) {
		tetramino = tetramino || this.#nextTetramino();

		this.#player = {
			x:
				Math.floor(this.#gameField.columns / 2) -
				Math.floor(tetramino.metrix.length / 2) -
				1,
			y: 0,
			tetramino,
		};

		this.#emit('newTetramino', { ...this.#player });
	}

	#queueInit() {
		this.#queue.elements = [];
		this.#queue.element.innerHTML = '';
		this.#queue.tetraminos = Array(this.#queue.size)
			.fill(0)
			.map(() => this.#randomTetramono());

		this.#queue.tetraminos.forEach((tetramino, index) => {
			this.#queue.elements[index] = this.#createGridWrapper();
			this.#queue.element.appendChild(this.#queue.elements[index]);
		});
	}

	#queueDraw() {
		this.#queue.tetraminos.forEach((tetramino, index) => {
			this.#drawTetramono(
				this.#removePaddingCells(tetramino),
				{ y: 0, x: 0 },
				this.#queue.grid[index]
			);
		});
	}

	#queueReset() {
		this.#queue.tetraminos.forEach((tetramino, index) => {
			const { width, height } = this.#tetraminoSize(tetramino);
			this.#createGrid(
				{
					...this.#queue,
					columns: width,
					rows: height,
				},
				index
			);
		});

		this.#queueDraw();
	}

	#randomTetramono() {
		const tetraminos = 'ijlostz';
		return JSON.parse(
			JSON.stringify({
				...this.#tetraminos[
					tetraminos[Math.floor(Math.random() * tetraminos.length)]
				],
			})
		);
	}

	#removeFullRows() {
		return new Promise((resolve, reject) => {
			let rowsRemoved = 0;

			for (let y = this.#gameField.grid.length - 1; y >= 0; y--) {
				if (this.#gameField.grid[y].every((column) => column.taken)) {
					const removedRow = this.#gameField.grid
						.splice(y, 1)[0]
						.map((column) => {
							column.taken = false;
							column.element.classList.remove(
								...Array.from(column.element.classList)
							);
							column.element.classList.add(this.#cssClasses.cell);
							column.element.remove();
							return column;
						});

					this.#gameField.grid.unshift(removedRow);
					this.#gameField.element.prepend(
						...removedRow.map((column) => column.element)
					);
					rowsRemoved++;
					y++;
				}

				if (y === 0) resolve(rowsRemoved);
			}
		});
	}

	#removePaddingCells(tetramino) {
		tetramino = {
			...tetramino,
			metrix: [...tetramino.metrix],
		};

		tetramino.metrix = tetramino.metrix
			.filter((row) => row.some((cell) => cell))
			.map((row) =>
				row.filter((cell, x) => {
					if (cell) return true;

					for (let y = 0; y < tetramino.metrix.length; y++) {
						if (tetramino.metrix[y][x]) return true;
					}

					return false;
				})
			);

		return tetramino;
	}

	#rotate(direction) {
		for (let y = 0; y < this.#player.tetramino.metrix.length; y++) {
			for (let x = 0; x < y; x++) {
				[
					this.#player.tetramino.metrix[y][x],
					this.#player.tetramino.metrix[x][y],
				] = [
					this.#player.tetramino.metrix[x][y],
					this.#player.tetramino.metrix[y][x],
				];
			}
		}

		if (direction > 0) {
			this.#player.tetramino.metrix.forEach((row) => row.reverse());
		} else {
			this.#player.tetramino.metrix.reverse();
		}
	}

	#scoreInit() {
		this.#score = {
			points: 0,
			lines: 0,
			level: 1,
		};
		this.#emit('scoreChange', { ...this.#score }, 0);
	}

	#scoreChange(rowsRemoved) {
		this.#score.lines += rowsRemoved;
		this.#score.points += rowsRemoved > 4 ? rowsRemoved * 10 : rowsRemoved * 20;
		this.#score.level =
			this.#score.points >= 1000 ? Math.floor(this.#score.points / 1000) : 1;
		this.#emit('scoreChange', { ...this.#score }, rowsRemoved);
	}

	#tetraminoSize(tetramino) {
		const fullRows = tetramino.metrix.filter((row) => row.some((cell) => cell));
		const xStart = [];
		const xEnd = [];

		fullRows.forEach((row) => {
			xStart.push(row.indexOf(1) + 1);
			xEnd.push(row.lastIndexOf(1) + 1);
		});

		return {
			width: Math.max(...xEnd) - Math.min(...xStart) + 1,
			height: fullRows.length,
		};
	}

	#undrawTetramono(
		tetramino = this.#player.tetramino,
		offset = { x: this.#player.x, y: this.#player.y },
		grid = this.#gameField.grid
	) {
		tetramino.metrix.forEach((row, y) =>
			row.forEach((column, x) => {
				if (!column) return;

				grid[offset.y + y][offset.x + x].element.classList.remove(
					this.#cssClasses.usedCell,
					this.#cssClasses.tetraminos[tetramino.name]
				);
				grid[offset.y + y][offset.x + x].taken = false;
			})
		);
	}

	async #update(time) {
		if (this.#lastMoveTime + this.#moveInterval() <= time) {
			try {
				await this.moveDown();
				this.#lastMoveTime = time;
			} catch (error) {}
		}
		this.#animationFrame = requestAnimationFrame(this.#update.bind(this));
	}

	#validateConstructorParam(obj, key) {
		if (!obj) {
			throw new Error(
				'TetrisGame class instantiation: The ' +
					key +
					' property is not defined!'
			);
		}
	}
}
