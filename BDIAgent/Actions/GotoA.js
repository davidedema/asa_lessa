import Plan from "../Plan.js";

class GotoA extends Plan {

    paths = [];

    isApplicableTo(desire) {
        return desire == 'go_to_astar';
    }

    findPath({ x, y }, grid, me, myAgent){
        grid.easystar.findPath(me.x, me.y, x, y, function (path) {
            if (path === null) {
                console.log("Path was not found ( :[ ).");
            } else {
                console.log(x,y)
                path.forEach(async ({ x, y }) => {
                    myAgent.queue('go_to', { x, y }, me);
                });
            }
        });
        grid.easystar.calculate();
        myAgent.queue('pickup', {})
        // console.log(myAgent.queue)
    }

    async execute({ x, y }, grid, me, myAgent) {

        let sub_int = [];
        this.findPath({ x, y }, grid, me, myAgent);
        me.carring = true;
    }

}

export default GotoA;