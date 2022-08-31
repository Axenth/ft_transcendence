import {ladder} from '../types/ladder.ts';

const calculateLadder = function (wins: number): ladder
{
    if (wins > 1) return ladder.BRONZE;
    else if (wins > 2) return ladder.IRON;
    else if (wins > 5) return ladder.SILVER;
    else if (wins > 10) return ladder.PLATINUM;
    else if (wins > 15) return ladder.DIAMOND;
    return ladder.NEW_PLAYER;
}

export default calculateLadder;