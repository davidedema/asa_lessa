(define (domain deliveroo_js)

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
        (parcel_at ?p - Parcel ?tile - Tile)
        (carrying ?p - Parcel)
    )

    (:action move_down
        :parameters (?tile1 - Tile ?tile2 - Tile)
        :precondition (and (at ?tile1) (below ?tile2 ?tile1))
        :effect (and (at ?tile2) (not (at ?tile1)))
    )
    (:action move_up
        :parameters (?tile1 - Tile ?tile2 - Tile)
        :precondition (and (at ?tile1) (above ?tile2 ?tile1))
        :effect (and (at ?tile2) (not (at ?tile1)))
    )
    (:action move_left
        :parameters (?tile1 - Tile ?tile2 - Tile)
        :precondition (and(at ?tile1) (left ?tile2 ?tile1))
        :effect (and (at ?tile2) (not (at ?tile1)))
    )
    (:action move_right
        :parameters (?tile1 - Tile ?tile2 - Tile)
        :precondition (and (at ?tile1) (right ?tile2 ?tile1))
        :effect (and (at ?tile2) (not (at ?tile1)))
    )
    (:action pick_up
        :parameters (?p - Parcel ?tile - Tile)
        :precondition (and (parcel_at ?p ?tile) (at ?tile) (not (carrying ?p)))
        :effect (and (carrying ?p) (not(parcel_at ?p ?tile)))
    )
    (:action put_down
        :parameters (?p - Parcel ?tile - Tile)
        :precondition (and (at ?tile)(carrying ?p))
        :effect (and (parcel_at ?p ?tile) (not(carrying ?p)))
    )
)