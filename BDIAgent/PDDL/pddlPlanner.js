/**
 * Class that creates a PDDL problem from a map and two points
 */
class PDDLPlanner {

    /**
     * 
     * @param {Grid} map - the map of the environment
     * @param {Graph.grid} from - the starting point 
     * @param {Graph.grid} to - the ending point
     */
    constructor(map, from, to) {
        this.map = map;
        this.from = map.ids[from.x][from.y];
        this.to = map.ids[to.x][to.y];
    }

    /**
     * Creates the PDDL problem file
     * @returns {String} the problem in PDDL format
     */
    async getProblem() {
        await this.createProblem();
        return this.problem_str + this.domain_str + this.objects_str + this.initState + this.goalState;
    }

    /**
     * Builds the PDDL problem with the given map and points
     */
    async createProblem() {
        this.problem_str = '(define (problem deliverooP) '
        this.domain_str = '(:domain deliveroojs) ';
        let { predicates, facts } = await this.computePredicatesAndFacts();
        // add initial point
        predicates.push(`(at ${this.from})`);
        // add all of the objects
        let objects_str = '(:objects ';
        for (let id of facts) {
            objects_str += ` ${id} - Tile `;
        }
        objects_str += `) `;
        this.objects_str = objects_str;
        let initState = '(:init ';
        // add all initial states
        for (let statement of predicates) {
            initState += `${statement} `;
        }
        initState += ') ';
        this.initState = initState;
        // add goal
        this.goalState = `(:goal (at ${this.to})) )`; //last parenthesis is for the problem-
    }

    /**
     * Computes the predicates and facts of the map 
     * @returns {Object} - the predicates and facts of the map
     */
    async computePredicatesAndFacts() {
        // create the facts
        let facts = new Set();
        // create the predicates
        let predicates = []

        // iterate through the map
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                // if not wall
                if (this.map.get(x, y) != 0) {
                    facts.add(this.map.ids[x][y]);
                        
                    // set the predicates below above left and right
                    if (y > 0 && this.map.get(x, y - 1) != 0) {
                        predicates.push(`(above ${this.map.ids[x][y]} ${this.map.ids[x][y - 1]})`);
                    }
                    if (y < this.map.height - 1 && this.map.get(x, y + 1) != 0) {
                        predicates.push(`(below ${this.map.ids[x][y]} ${this.map.ids[x][y + 1]})`);
                    }
                    if (x > 0 && this.map.get(x - 1, y) != 0) {
                        predicates.push(`(right ${this.map.ids[x][y]} ${this.map.ids[x - 1][y]})`);
                    }
                    if (x < this.map.width - 1 && this.map.get(x + 1, y) != 0) {
                        predicates.push(`(left ${this.map.ids[x][y]} ${this.map.ids[x + 1][y]})`);
                    }
                }
            }
        }

        return { predicates, facts };

    }
}

export { PDDLPlanner };