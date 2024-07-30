import Plan from "../Plan.js";
import client from "../client.js";

class GoPickUp extends Plan {

    #desire = 'go_pick_up';

    isApplicableTo(desire) {
        return desire == this.#desire;
    }

    async execute(intentionRevision,father_desire,{ x, y }, grid, me) {
        await this.subIntention(intentionRevision,this.#desire,'pdll_move', { x, y }, grid, me);
        await client.pickup()
        
        const numberOfParcelsCarried = me._number_of_parcels_carried +1;
        me.number_of_parcels_carried = numberOfParcelsCarried;
    }

}

export default GoPickUp;