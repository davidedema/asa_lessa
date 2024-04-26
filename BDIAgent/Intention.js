import BlindMove from "./Actions/BlindMove.js";
import GoPickUp from "./Actions/GoPickUp.js";
import GotoA from "./Actions/GotoA.js";

const plans = [];

plans.push(new GoPickUp());
plans.push(new BlindMove());
plans.push(new GotoA());

class Intention extends Promise {

    #current_plan;
    stop() {
        console.log('stop intention and current plan');
        this.#current_plan.stop();
    }

    #desire;
    #args;

    #resolve;
    #reject;

    constructor(desire, ...args) {
        var resolve, reject;
        super(async (res, rej) => {
            resolve = res; reject = rej;
        })
        this.#resolve = resolve
        this.#reject = reject
        this.#desire = desire;
        this.#args = args;
    }

    #started = false;
    async achieve() {
        if (this.#started)
            return this;
        else
            this.#started = true;

        for (const plan of plans) {
            if (plan.isApplicableTo(this.#desire)) {
                this.#current_plan = plan;
                // console.log('achieving desire', this.#desire, ...this.#args, 'with plan', plan);
                try {
                    const plan_res = await plan.execute(...this.#args);
                    this.#resolve(plan_res);
                    // console.log('plan', plan, 'succesfully achieved intention', this.#desire, ...this.#args, 'with result', plan_res);
                    return plan_res
                } catch (error) {
                    // console.log('plan', plan, 'failed while trying to achieve intention', this.#desire, ...this.#args, 'with error', error);
                }
            }
        }

        this.#reject();
        // console.log('no plan satisfied the desire ', this.#desire, ...this.#args);
        // throw 'no plan satisfied the desire ' + this.#desire;
    }

}

export default Intention;