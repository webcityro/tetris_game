// Imports
import TetrisGame from './TetrisGame.js';

// Initialize vars

const container = document.querySelector('.container');
const gameField = document.querySelector('.game-frame');
const hold = document.querySelector('.hold');
const queue = document.querySelector('.queue');
const score = document.querySelector('.score');
const level = document.querySelector('.level');
const lines = document.querySelector('.lines');
const startModel = document.querySelector('.start-modal');
const pausedModel = document.querySelector('.paused-modal');
const gameOverModel = document.querySelector('.game-over-modal');
const startBtn = document.querySelector('.start-btn');
const restartBtns = document.querySelectorAll('.restart-btn');
const pauseBtn = document.querySelector('.pause-btn');
const resumeBtn = document.querySelector('.resume-btn');

//  Initialize game
const game = new TetrisGame({
	gameField: {
		columns: 10,
		rows: 20,
		element: gameField,
	},
	queue,
	hold,
	cssClasses: {
		grid: 'grid',
		cell: 'cell',
		usedCell: 'tetramino',
		tetraminos: {
			i: 'aqua',
			t: 'blue',
			o: 'yellow',
			l: 'red',
			j: 'orange',
			s: 'green',
			z: 'violet',
		},
	},
});

game
	.on('ready', () => startModel.classList.remove('hide'))
	.on('scoreChange', ({ points, level: lv, lines: ln }) => {
		score.innerHTML = points;
		level.innerHTML = lv;
		lines.innerHTML = ln;
	})
	.on('pause', () => pausedModel.classList.remove('hide'))
	.on('resume', () => pausedModel.classList.add('hide'))
	.on('gameOver', () => gameOverModel.classList.remove('hide'))
	.on('start', () => {
		startModel.classList.add('hide');
		pausedModel.classList.add('hide');
		gameOverModel.classList.add('hide');
	})
	.init();

// user input
document.addEventListener('keydown', async (e) => {
	e.preventDefault();

	switch (e.keyCode) {
		case 40:
			try {
				await game.moveDown();
			} catch (error) {}
			break;
		case 37:
			game.moveHorizontally(-1);
			break;
		case 39:
			game.moveHorizontally(1);
			break;
		case 188:
			game.playerRotate(-1);
			break;
		case 190:
			game.playerRotate(1);
			break;
		case 13:
			if (game.status() === 'playing') game.holdSwap();
			else if (game.status() === 'paused') game.resume();
			else if (game.status() === 'ready') game.start();
			break;
		case 32:
			game.hardDrop();
			break;
		case 27:
			game.pause();
			break;
	}
});

startBtn.addEventListener('click', ({ target: btn }) => {
	btn.classList.add('hide');

	let counter = 3;
	const countDownDiv = document.createElement('div');
	countDownDiv.style.fontSize = '5rem';
	countDownDiv.style.textAlign = 'center';
	countDownDiv.innerHTML = counter;

	startModel.querySelector('.card-body').appendChild(countDownDiv);

	const interval = setInterval(() => {
		counter--;
		countDownDiv.innerHTML = counter;

		if (counter === 0) {
			game.start();
			countDownDiv.remove();
			btn.classList.remove('hide');
			clearInterval(interval);
		}
	}, 1000);
});
[...restartBtns].forEach((btn) =>
	btn.addEventListener('click', () => game.restart())
);
pauseBtn.addEventListener('click', () => game.pause());
resumeBtn.addEventListener('click', () => game.resume());
