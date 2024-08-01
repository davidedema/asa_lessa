import Plan from "../Plan.js";
import client from "../client.js";
import { astar, Graph } from '../astar.js';

class GotoA extends Plan {

    isApplicableTo(desire) {
        return desire == 'go_to_astar';
    }

    async execute(intentionRevision, father_desire,{ x, y }, grid, me) {

        const graph = new Graph(grid.getMap());
        const start = graph.grid[Math.floor(me.x)][Math.floor(me.y)];
        const end = graph.grid[x][y];
        const result = astar.search(graph, start, end);

        for (let i = 0; i < result.length; i++) {
            const best = intentionRevision.select_best_intention()
            if (best.get_predicate() != father_desire && father_desire == 'go_put_down') {
                throw ['FIND ANOTHER INTENTION ', x, y];
            }else if(father_desire == 'go_pick_up'){
                const best_position = { x: best.get_args()[0].x, y: best.get_args()[0].y }
                if (best_position.x != end.x || best_position.y != end.y) {
                    throw ['FIND ANOTHER INTENTION ', x, y];
                }
            }

            x = result[i].x;
            y = result[i].y;
            // console.log('moving to', x, y);
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
                console.log('stucked');

                throw ['stucked', x, y];
            } else if (me.x == x && me.y == y) {
                // console.log('target reached')
            }

            // if some parcels are in the way, pick them up
            await client.pickup();
        }
    }



}

export default GotoA;