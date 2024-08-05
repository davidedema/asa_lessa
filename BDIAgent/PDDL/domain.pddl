(define (domain deliveroojs)

    (:requirements :strips :typing :disjunctive-preconditions)

    (:types
        Tile Parcel
    )

    (:predicates
        (below ?tile1 - Tile ?tile2 - Tile)
        (above ?tile1 - Tile ?tile2 - Tile)
        (left ?tile1 - Tile ?tile2 - Tile)
        (right ?tile1 - Tile ?tile2 - Tile)
        (at ?tile - Tile)
    )

    (:action down
        :parameters (?tile1 - Tile ?tile2 - Tile)
        :precondition (and (at ?tile1) (below ?tile2 ?tile1))
        :effect (and (at ?tile2) (not (at ?tile1)))
    )
    (:action up
        :parameters (?tile1 - Tile ?tile2 - Tile)
        :precondition (and (at ?tile1) (above ?tile2 ?tile1))
        :effect (and (at ?tile2) (not (at ?tile1)))
    )
    (:action left
        :parameters (?tile1 - Tile ?tile2 - Tile)
        :precondition (and(at ?tile1) (left ?tile2 ?tile1))
        :effect (and (at ?tile2) (not (at ?tile1)))
    )
    (:action right
        :parameters (?tile1 - Tile ?tile2 - Tile)
        :precondition (and (at ?tile1) (right ?tile2 ?tile1))
        :effect (and (at ?tile2) (not (at ?tile1)))
    )
)