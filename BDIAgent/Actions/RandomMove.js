import Plan from "../Plan.js";

class RandomMove extends Plan {

    isApplicableTo(desire) {
        return desire == 'random_move';
    }

    async execute(intentionRevision,father_desire,grid, me) {
        const destination = grid.getSpawnPoints();
        const randomIndex = Math.floor(Math.random() * destination.length);
        const { x, y } = destination[randomIndex];
        await this.subIntention(intentionRevision, "random_move", 'go_to_astar', { x, y }, grid, me);

    }

}

export default RandomMove;