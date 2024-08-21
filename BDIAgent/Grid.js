class Grid {
    /**
     * MAP SE 1 deliver, 2 normale 0 muro
     */

    #map;
    #deliverPoints = [];
    #agentMap = {};

    constructor(width, height) {
        this.width = width
        this.height = height
        this.#map = Array(width).fill().map(() => Array(height).fill(0));
        this.ids = Array(width).fill().map(() => Array(height).fill(0));
    }

    set(x, y, value) {
        this.#map[y][x] = value;
        if (value == 1) {
            this.#deliverPoints.push({ x: y, y: x });
        }
    }

    setSpawnPoints(spawnPoints) {
        this.spawnPoints = spawnPoints;
    }

    getSpawnPoints() {
        return this.spawnPoints;
    }

    setIds() {
        // use this.ids and gives a alphabetic id for each tile
        // TODO MAP IS CREATED NOT GOOD
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // not wall
                if (this.#map[y][x] != 0) {
                    this.ids[y][x] = String.fromCharCode(65 + y) + (x + 1);
                } else {
                    this.ids[y][x] = 0;
                }
            }
        }
    }

    setAgent(id, x, y, time) {
        this.#agentMap[id] = { id: id, x: x, y: y, time: time };
        // this.#agentMap = this.#agentMap.filter(agent => agent.id !== id);
        // this.#agentMap.push({ id: id, x: x, y: y, time: time });
    }

    getAgentMap() {
        let returnArray = [];
        for (let key in this.#agentMap) {
            returnArray.push(this.#agentMap[key]);
        }

        return returnArray;
    }

    get(x, y) {
        return this.#map[x][y];
    }

    getMap() {


        let tmpAgentMap = this.getAgentMap();
        // Filter and remove agents that haven't been seen for 10 seconds
        tmpAgentMap = tmpAgentMap.filter(agent => {
            return agent.time >= Date.now() - 10000;
        });

        // For each agent, update the cell weight


        const grid = this.#map;
        grid.forEach((row, x) => {
            row.forEach((cell, y) => {
                if (cell != 0) {
                    grid[x][y] = 1;
                }
            })
        })

        // this.#agentMap.forEach(agent => {
        //     // console.log(agent.x, agent.y)
        //     if( Date.now() - agent.time + 1 < 0){
        //         throw new Error("NEGATIVE TIME")
        //     }
        //     grid[parseInt(agent.x)][parseInt(agent.x)] = Date.now() - agent.time + 1;
        //     // console.log("AGENTE",agent.x, agent.y,Date.now(), agent.time, Date.now() - agent.time)
        // });


        return grid;
    }

    getDeliverPoints() {
        return this.#deliverPoints;
    }

    print() {
        for (let y = 0; y < this.height; y++) {
            let row = '';
            for (let x = 0; x < this.width; x++) {
                row += this.get(x, y);
            }
            console.log(row);
        }
    }

    getReachablePoints(startX, startY) {

        // these method returns the reachable points from a given point

        const matrix = this.getMap();

        const agentMap = this.getAgentMap()

        const agentPosition = new Set();

        for (const agent of agentMap) {
            agentPosition.add(`${agent.x},${agent.y}`);
        }


        if (matrix[startX][startY] === 0) {
            return [];
        }

        const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]]; // Down, Up, Right, Left
        const reachable = [];
        const rows = matrix.length;
        const cols = matrix[0].length;
        const queue = [[startX, startY]];
        const visited = new Set();
        visited.add(`${startX},${startY}`);


        while (queue.length > 0) {
            const [currentX, currentY] = queue.shift();
            reachable.push({ x: currentX, y: currentY });

            for (let direction of directions) {
                const newX = currentX + direction[0];
                const newY = currentY + direction[1];
                const newPos = `${newX},${newY}`;

                if (newX >= 0 && newX < rows && newY >= 0 && newY < cols &&
                    !visited.has(newPos) && matrix[newX][newY] !== 0 && !agentPosition.has(newPos)) {
                    queue.push([newX, newY]);
                    visited.add(newPos);
                }
            }
        }

        return reachable;
    }

    getPossibleDirection(x, y) {

        const tmpAgentMap = this.getAgentMap();

        const now = Date.now();

        let directions = [];
        if (x > 0 && this.get(x - 1, y) !== undefined && this.get(x - 1, y) !== 0) {
            directions.push({ x: x - 1, y: y, name: "left" });
        }
        if (x < this.width && this.get(x + 1, y) !== undefined && this.get(x + 1, y) !== 0) {
            directions.push({ x: x + 1, y: y, name: "right" });
        }
        if (y > 0 && this.get(x, y - 1) !== undefined && this.get(x, y - 1) !== 0) {
            directions.push({ x: x, y: y - 1, name: "down" });
        }
        if (y < this.height && this.get(x, y + 1) !== undefined && this.get(x, y + 1) !== 0) {
            directions.push({ x: x, y: y + 1, name: "up" });
        }

        const realDirections = [];
        for (let i = 0; i < directions.length; i++) {
            let free = true
            for (let j = 0; j < tmpAgentMap.length; j++) {
                // if( tmpAgentMap[j].x === directions[i].x &&  tmpAgentMap[j].y === directions[i].y && now -  tmpAgentMap[j].time < 2000){
                if (tmpAgentMap[j].x === directions[i].x && tmpAgentMap[j].y === directions[i].y) {
                    free = false;
                    break;
                }
            }
            if (free) {
                realDirections.push(directions[i]);
            }
        }

        return realDirections;
    }

}

export default Grid;