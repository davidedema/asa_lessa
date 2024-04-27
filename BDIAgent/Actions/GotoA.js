import Plan from "../Plan.js";
import client from "../client.js";
import {astar, Graph} from '../astar.js';

class GotoA extends Plan {

    isApplicableTo(desire) {
        return desire == 'go_to_astar';
    }

    async execute({ x, y }, grid, me) {
        const graph = new Graph(grid);
        const start = graph.grid[me.x][me.y];
        const end = graph.grid[x][y];
        const result = astar.search(graph, start, end);

        for (let i = 0; i < result.length; i++) {
            x = result[i].x;
            y = result[i].y;
            console.log('moving to', x, y);
            let status_x = undefined;
            let status_y = undefined;

            // console.log('me', me);

            if (x > me.x)
                status_x = await client.move('right')
            // status_x = await this.subIntention( 'go_to', {x: me.x+1, y: me.y} );
            else if (x < me.x)
                status_x = await client.move('left')
            // status_x = await this.subIntention( 'go_to', {x: me.x-1, y: me.y} );

            if (status_x) {
                me.x = status_x.x;
                me.y = status_x.y;
            }

            if (y > me.y)
                status_y = await client.move('up')
            // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y+1} );
            else if (y < me.y)
                status_y = await client.move('down')
            // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y-1} );

            if (status_y) {
                me.x = status_y.x;
                me.y = status_y.y;
            }

            if (!status_x && !status_y) {
                console.log('stucked')
                break;
            } else if (me.x == x && me.y == y) {
                // console.log('target reached')
            }
        }
    }



}

export default GotoA;