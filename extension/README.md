# Roland Garros API

API to retrieve list of dates, zones, seats and cart

## Endpoints

---

/api/v2/en/ticket/calendar/offers-grouped-by-sorted-offer-type/`<DATE> `

METHOD: GET

Example: https://tickets.rolandgarros.com/api/v2/en/ticket/calendar/offers-grouped-by-sorted-offer-type/2025-05-25

Response body:

```json
[
    {
        "offerType": {
            ...
        },
        "offers": [
            {
                "offerId": 47, // OFFER_ID
                "sessionTypes": "SOI", // SOI - Night, JOU - Day (used for nightSession=boolean)
                "sessionIds": [2677], // SESSION_ID
            }
        ],
        ...
    }
]
```

---

/api/v2/en/ticket/category/page/offer/<OFFER_ID>/date/`<DATE>`/sessions/<SESSION_ID>?nightSession=true

METHOD: GET

Example: https://tickets.rolandgarros.com/api/v2/en/ticket/category/page/offer/47/date/2025-05-25/sessions/2677?nightSession=true

Response body:

```json
{
    ...
     "categories": [
        {
            "id": 11,
            "price": 55,
            "priceId": 86039, // PRICE_ID
            "color": "#58c9ff",
            "code": "Cat.3",
            "canSelectZone": true,
            "longName": "Category 3",
            "hasStock": false,
            "isPmr": false,
            "isAnnexeUp": false,
            "shortName": "Cat. 3",
            "isVR": false
        },
        {
            "id": 69,
            "price": 55,
            "priceId": 86167, // PRICE_ID
            "color": "#32415D",
            "code": "Cat. VR",
            "canSelectZone": true,
            "longName": "Restricted view",
            "hasStock": false,
            "isPmr": false,
            "isAnnexeUp": false,
            "shortName": "Cat. RV",
            "isVR": true
        },
     ],
    "stadium": {
        ...
        "zoneCoordinates": [
            ...
            {
                "id": 886, // ZONE_ID
                "coordinateSvg": null,
                "categoryZoneStocks": []
            },
            {
                "id": 898, // ZONE_ID
                "coordinateSvg": "536,725,536,797,424,797,413,791,401,782,389,771,376,771,370,765,435,681,436,692,441,703,449,712,459,719,468,723,479,725",
                "categoryZoneStocks": [
                    {
                        "categoryId": 3,
                        "quantity": 1,
                        "color": "#ffca2a"
                    }
                ]
            },
            ...
        ],
        ...
    }
    ...
}


```

---

/api/v2/ticket/category/zone/<ZONE_ID>/sessions/<SESSION_ID>/priceId/<PRICE_ID>?nightSession=true

METHOD: GET

Example: https://tickets.rolandgarros.com/api/v2/ticket/category/zone/898/sessions/2677/priceId/86037?nightSession=true

Response body:

```json
{
    ...
    "seatCoordinates": [
        {
            "id": 135737,
            "isAvailable": false,
            "isInCart": false,
            "coordinate": "781,738,785,733,795,731,800,731,809,732,813,736,814,739,814,746,811,759,809,761,807,762,790,762,787,761,785,759,782,746",
            "categoryId": null,
            "stairs": null,
            "row": null,
            "seatNumber": null,
            "panoramaId": null,
            "lodge": null
        },
        {
            "id": 135951, // seatId for payload
            "isAvailable": true,
            "isInCart": false,
            "coordinate": "962,1208,966,1202,978,1200,984,1200,994,1202,999,1206,1000,1210,1000,1217,996,1232,994,1235,991,1235,972,1236,969,1235,966,1232,962,1217",
            "categoryId": 68,
            "stairs": "22",
            "row": "8",
            "seatNumber": "50",
            "panoramaId": 23400012,
            "lodge": null
        },
        ...
    ],
}
```

---

/api/v2/ticket/cart/ticket-product-by-seat

METHOD: POST

Payload:

```json
{
    "priceId": 85851,
    "seatId": 135951
}
```

Response body:

```json
{
    "seatDetails": [
        {
            "cartProductId": 127397408,
            "access": "C20",
            "stairs": "22",
            "row": "8",
            "seatNumber": 50,
            "price": 985.0,
            "zoneId": 572,
            "standId": 66,
            "lodge": "5",
            "showOnlyAccessAndStairs": false
        }
    ],
    "isAdjacent": true
}
```

---

(maybe optional)
api/v2/ticket/access/authorization

METHOD: GET

Response body:

```json
true
```

or

```json
false
```

---
