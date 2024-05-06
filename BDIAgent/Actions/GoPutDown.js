import Plan from "../Plan.js";
import client from "../client.js";
import { astar, Graph } from "../astar.js";

class GoPutDown extends Plan {

    isApplicableTo(desire) {
        return desire == 'go_put_down';
    }

    findClosestDeliveryPoint(x, y, grid, deliveryPoints) {
        const graph = new Graph(grid);
        const start = graph.grid[x][y];
        const end = graph.grid[deliveryPoints[0].x][deliveryPoints[0].y];
        let closestDeliveryPoint = astar.search(graph, start, end);
        for (const deliveryPoint of deliveryPoints) {
            const end = graph.grid[deliveryPoint.x][deliveryPoint.y];
            const result = astar.search(graph, start, end);
            if (result.length < closestDeliveryPoint.length) {
                closestDeliveryPoint = result;
            }
        }
        return closestDeliveryPoint[closestDeliveryPoint.length - 1];
    }

    async execute(grid, deliveryPoints, me) {
        const deliverPoint = this.findClosestDeliveryPoint(me.x, me.y, grid.getMap(), deliveryPoints);
        await this.subIntention('go_to_astar', deliverPoint, grid, me);
        await client.putdown()
        me.number_of_parcels_carried = 0;
    }

}

export default GoPutDown;