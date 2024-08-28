import Plan from "../Plan.js";

class RandomMove extends Plan {

    isApplicableTo(desire) {
        return desire == 'random_move';
    }

    async execute(intentionRevision, father_desire, grid, me) {

        // Get the possible spawn point for the parcels
        let destination = grid.getSpawnPoints();
        // Checl if strategy is present
        if(me.strategy === "split_map"){
            destination = destination.filter(point => {
                if (point.x >= me.splitMapZone.minX && point.x <= me.splitMapZone.maxX && point.y >= me.splitMapZone.minY && point.y <= me.splitMapZone.maxY) {
                    return true;
                }else{
                    return false;
                }
            });
        }
        // Select random tile
        const randomIndex = Math.floor(Math.random() * destination.length);
        const { x, y } = destination[randomIndex];
        await this.subIntention(intentionRevision, "random_move", 'go_to_astar', { x, y }, grid, me);

    }

}

export default RandomMove;