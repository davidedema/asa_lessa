import Intention from './Intention.js';

class Plan {

    stop() {
        console.log('stop plan and all sub intentions');
        for (const i of this.#sub_intentions) {
            i.stop();
        }
    }

    #sub_intentions = [];

    async subIntention(intentionRevision,father_desire,desire, ...args) {
        const sub_intention = new Intention(intentionRevision,father_desire ,desire, ...args);
        this.#sub_intentions.push(sub_intention);
        return await sub_intention.achieve();
    }

}

export default Plan;