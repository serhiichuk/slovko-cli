const fs = require('fs');
const https = require('https');
const readline = require('readline');

const WORDS_LENGTH = 5;
const MAX_ATTEMPTS = 6;

const request = (url) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { resolve(data) });
    }).on("error", reject);
});

const random = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const Log = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",
    // Foreground (text) colors
    fg: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
        crimson: "\x1b[38m"
    },
    // Background colors
    bg: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m",
        crimson: "\x1b[48m"
    }
};

const color = (color, text) => `${color}${text}${Log.reset}`;

async function loadLibrary() {
    if (fs.existsSync('./library.json')) return require('./library.json');
    const dataUrls = [
        'https://raw.githubusercontent.com/brown-uk/dict_uk/master/data/dict/vulgar.lst',
        'https://raw.githubusercontent.com/brown-uk/dict_uk/master/data/dict/alt.lst',
        'https://raw.githubusercontent.com/brown-uk/dict_uk/master/data/dict/base.lst',
    ];

    const library = await Promise.all(dataUrls.map(async (url) => {
        const data = await request(url);
        const words = data.split('\n').map(s => s.replace(/\#|\s.+/, '')).filter(w => w.length === WORDS_LENGTH && !w.match(/\'|\-/g));
        return words;
    })).then(worlds => worlds.flat().sort());

    await fs.promises.writeFile('./library.json', JSON.stringify(library));
    return [...library];
}

async function main() {
    const library = await loadLibrary();

    const renderMainViewState = state => state.reduce((acc, row) => {
        return acc + row.join('') + '\n';
    }, '');

    let attempt = 0;
    const word = library[random(0, library.length - 1)].toLowerCase();
    const mainViewState = Array(6).fill().map(_ => (Array(5).fill().map(_ => `[ ]`)));

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.write(renderMainViewState(mainViewState));
    rl.prompt();

    rl.on('close', () => {
        console.log('Ганого дня!');
        process.exit(0);
    });

    rl.on('line', (line) => {
        const answer = line.trim().toLowerCase();
        const isValid = answer.length === WORDS_LENGTH && library.includes(answer);

        if (!isValid) {
            console.log('Моя такого не панімать')
            rl.prompt();
            return;
        }

        const row = mainViewState[attempt];

        answer.split('').forEach((letter, index) => {
            const isOnCorrectPosition = word[index] === letter;
            const isExistInWord = word.split('').includes(letter);

            if (isOnCorrectPosition) {
                row[index] = color(Log.fg.green, `[${letter}]`);
            } else if (isExistInWord) {
                row[index] = color(Log.fg.yellow, `[${letter}]`);
            } else {
                row[index] = `[${letter}]`;
            }
        });

        console.log(renderMainViewState(mainViewState))
        rl.prompt();

        if (answer === word) {
            console.log('Вітаю');
            console.log('Гарного дня!');
            process.exit(0);
        }

        if (attempt === MAX_ATTEMPTS - 1) {
            console.log('Наступного разу вгадаєш)');
            console.log(word.split('').map(w=> color(Log.fg.green, `[${w}]`)).join(''));
            process.exit(0);
        }

        attempt++;
    });
}

main();
