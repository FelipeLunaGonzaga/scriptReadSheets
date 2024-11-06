"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("../app"));
app_1.default.post('/process-data', (req, res) => {
    const directoryPath = path.join(__dirname, '01 JANUARY 2024');
    if (fs.existsSync(directoryPath)) {
        readSpreadsheetsInDirectory(directoryPath);
        setTimeout(() => {
            exportDataToCSV();
            res.send('Data processing completed and CSV exported.');
        }, 5000);
    }
    else {
        res.status(404).send('Specified directory does not exist.');
    }
});
