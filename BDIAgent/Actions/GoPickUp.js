import Plan from "../Plan.js";
import client from "../client.js";

class GoPickUp extends Plan {

    isApplicableTo(desire) {
        return desire == 'go_pick_up';
    }

    async execute({ x, y }, grid, me) {
        await this.subIntention('go_to_astar', { x, y }, grid, me);
        await client.pickup()
    }

}

export default GoPickUp;