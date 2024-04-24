import  easystar  from "easystarjs";


class Grid {

    
    #map;
    
    constructor(width, height) {
        this.easystar = new easystar.js();
        this.width = width
        this.height = height
        this.#map = Array(width).fill().map(() => Array(height).fill('#'))
        console.log('map', this.#map);
    }

    set(x, y, value) {
        this.#map[x][y] = value;
    }

    get(x, y) {
        return this.#map[x][y];
    }

    getMap() {
        return this.#map;
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