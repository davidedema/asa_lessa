export function areStuckedInACLosedPath(directions1, directions2) {
    if (directions1.length > 1 || directions2.length > 1) {
        return false;
    } else if (directions1.length === 1 && directions2.length === 1) {
        return true;
    }
    else if (directions1.length === 0 || directions2.length === 0) {
        return true;
    }
    else {
        return false;
    }
}

/**
 * 
 * @param {string} direction - the actual direction
 * @returns The opposite direction
 */
export function getOppositeDirection(direction) {
    if (direction === "up") {
        return "down";
    }
    if (direction === "down") {
        return "up";
    }
    if (direction === "left") {
        return "right";
    }
    if (direction === "right") {
        return "left";
    }
}

export function computeManhattanDistance(start, end){
    return Math.abs(start.x - end.x) + Math.abs(start.y - end.y);
}