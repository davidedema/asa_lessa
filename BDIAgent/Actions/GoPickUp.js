import Plan from "../Plan.js";
import client from "../client.js";

class GoPickUp extends Plan {

    #desire = 'go_pick_up';

    isApplicableTo(desire) {
        return desire == this.#desire;
    }

    async execute(intentionRevision,{ x, y }, grid, me) {
        // Check if using PDDL or not
        if (me.pddl) {
            await this.subIntention(intentionRevision,this.#desire,'pdll_move', { x, y }, grid, me);
        }
        else {
            await this.subIntention(intentionRevision,this.#desire,'go_to_astar', { x, y }, grid, me);
        }
        await client.pickup()
        // Update the number of parcels carried
        const numberOfParcelsCarried = me._number_of_parcels_carried +1;
        me.number_of_parcels_carried = numberOfParcelsCarried;
    }

}

export default GoPickUp;