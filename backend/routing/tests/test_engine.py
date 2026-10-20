from django.test import SimpleTestCase

from routing.engine import recommend_best_route


class RecommendBestRouteTests(SimpleTestCase):
    def test_avoids_routes_with_no_travel_miles(self):
        routes = [
            {
                "route_id": "shorter-severe",
                "miles": {"Severe": 10, "No Travel": 50},
                "time": 100,
            },
            {
                "route_id": "no-no-travel",
                "miles": {"Severe": 40},
                "time": 200,
            },
        ]

        self.assertEqual(
            recommend_best_route(routes)["route_id"],
            "no-no-travel",
        )

    def test_uses_average_risk_when_severe_and_high_miles_tie(self):
        routes = [
            {
                "route_id": "faster-riskier",
                "miles": {"Severe": 0, "High": 10},
                "avg_risk": 4.0,
                "time": 100,
            },
            {
                "route_id": "slower-safer",
                "miles": {"Severe": 0, "High": 10},
                "avg_risk": 1.0,
                "time": 200,
            },
        ]

        self.assertEqual(
            recommend_best_route(routes)["route_id"],
            "slower-safer",
        )

    def test_uses_time_when_risk_metrics_tie(self):
        routes = [
            {
                "route_id": "slow",
                "miles": {"Severe": 0, "High": 10},
                "avg_risk": 1.0,
                "time": 200,
            },
            {
                "route_id": "fast",
                "miles": {"Severe": 0, "High": 10},
                "avg_risk": 1.0,
                "time": 100,
            },
        ]

        self.assertEqual(recommend_best_route(routes)["route_id"], "fast")
