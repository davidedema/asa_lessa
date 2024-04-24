import Plan from "../Plan.js";
import client from "../client.js";

class GoPickUp extends Plan {

    isApplicableTo(desire) {
        return desire == 'go_pick_up';
    }

    async execute({ x, y }) {
        await this.subIntention('go_to', { x, y });
        await client.pickup()
    }

}

export default GoPickUp;