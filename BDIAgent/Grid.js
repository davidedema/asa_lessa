class Grid {
    /**
     * MAP SE 1 deliver, 2 normale 0 muro
     */

    #map;
    #deliverPoints = [];
    #agentMap = [];

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
        this.#agentMap.push({ id: id, x: x, y: y, time: time });
    }

    getAgentMap() {
        return this.#agentMap;
    }

    get(x, y) {
        return this.#map[x][y];
    }

    getMap() {



        // Filter and remove agents that haven't been seen for 10 seconds
        this.#agentMap = this.#agentMap.filter(agent => {
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

}

export default Grid;