import Plan from "../Plan.js";
import client from "../client.js";


class Pickup extends Plan {

    isApplicableTo(desire) {
        return desire == 'pickup';
    }

    async execute() {
        console.log('Agent is executing pickup action');
        await client.pickup()
    }

}

export default Pickup;