import Plan from "../Plan.js";
import client from "../client.js";
import { astar, Graph } from "../astar.js";

class GoPutDown extends Plan {

    #desire = 'go_put_down';

    isApplicableTo(desire) {
        return desire == this.#desire;
    }
    /**
     * 
     * @param {float} x - the x coordinate of the agent 
     * @param {float} y - the y coordinate
     * @param {Graph.grid} grid - the environment grid
     * @param {Array} deliveryPoints - the possible delivery points
     * @returns the closest delivery point wrt the agent
     */
    findClosestDeliveryPoint(x, y, grid, deliveryPoints) {
        const graph = new Graph(grid);
        const start = graph.grid[x][y];
        const end = graph.grid[deliveryPoints[0].x][deliveryPoints[0].y];
    
        let closestDeliveryPoint = astar.search(graph, start, end);
        for (const deliveryPoint of deliveryPoints) {
            const end = graph.grid[deliveryPoint.x][deliveryPoint.y];
            if (start.x === end.x && start.y === end.y) {
                return end;
            }
            const result = astar.search(graph, start, end);
            if (closestDeliveryPoint.length > 0 && result.length > 0){
                if (result.length < closestDeliveryPoint.length) {
                    closestDeliveryPoint = result;
                }
            }else{
                if(result.length > 0){
                    closestDeliveryPoint = result;
                }
            }
        }
        return closestDeliveryPoint[closestDeliveryPoint.length - 1];
    }

    async execute(intentionRevision,father_desire,grid, deliveryPoints, me) {
        if (me.number_of_parcels_carried != 0 || father_desire === "priority_action") {
            const deliverPoint = this.findClosestDeliveryPoint(me.x, me.y, grid.getMap(), deliveryPoints);

            // Check if using PDDL
            if (me.pddl) {
                await this.subIntention(intentionRevision,this.#desire,'pdll_move', deliverPoint, grid, me);
            }
            else{
                if (father_desire === "priority_action") {
                    await this.subIntention(intentionRevision,"priority_action",'go_to_astar', deliverPoint, grid, me);

                }else{
                    await this.subIntention(intentionRevision,this.#desire,'go_to_astar', deliverPoint, grid, me);
                }
            }
            await client.putdown()
            // Reset counter of carried parcels
            me.number_of_parcels_carried = 0;
        }
        else {
            console.log("I don't have any parcels to deliver");
        }
    }

}

export default GoPutDown;