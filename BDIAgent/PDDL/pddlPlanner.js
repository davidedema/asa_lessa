import { Beliefset, onlineSolver, PddlExecutor, PddlProblem } from "@unitn-asa/pddl-client";

import fs from 'fs';

function readFile ( path ) {
    
    return new Promise( (res, rej) => {

        fs.readFile( path, 'utf8', (err, data) => {
            if (err) rej(err)
            else res(data)
        })

    })

}

class PDDLPlanner {
    constructor(map, from, to) {
        this.map = map;
        this.from = from;
        this.to = to;
    }

    async getProblem() {
        await this.createProblem();
    }

    async createProblem() {
        this.problem_str = '(define (problem deliverooP) '
        this.domain_str = '(:domain deliveroojs) ';
        let { predicates, facts } = await this.computePredicatesAndFacts();
        // add initial point
        statementList.push(`(at ${this.from.id})`);
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
        this.goalState = `(:goal (at ${this.to.id})) )`; //last parenthesis is for the problem-
    }

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
                        predicates.push(`(left ${this.map.ids[x][y]} ${this.map.ids[x - 1][y]})`);
                    }
                    if (x < this.map.width - 1 && this.map.get(x + 1, y) != 0) {
                        predicates.push(`(right ${this.map.ids[x][y]} ${this.map.ids[x + 1][y]})`);
                    }
                }
            }
        }

        return { predicates, facts };

    }
}

export { PDDLPlanner };