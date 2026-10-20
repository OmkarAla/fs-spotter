from django.test import SimpleTestCase

from routing.engine import calculate_checkpoint_risk


class RiskThresholdTests(SimpleTestCase):
    def test_wind_thresholds(self):
        self.assertEqual(calculate_checkpoint_risk({"wind": 20}, 10000), "Low")
        self.assertEqual(calculate_checkpoint_risk({"wind": 30}, 10000), "Moderate")
        self.assertEqual(calculate_checkpoint_risk({"wind": 40}, 10000), "High")
        self.assertEqual(calculate_checkpoint_risk({"wind": 50}, 10000), "Severe")
        self.assertEqual(calculate_checkpoint_risk({"wind": 60}, 10000), "No Travel")

    def test_rain_thresholds(self):
        self.assertEqual(calculate_checkpoint_risk({"rain": 0.05}, 10000), "Low")
        self.assertEqual(calculate_checkpoint_risk({"rain": 0.20}, 10000), "Moderate")
        self.assertEqual(calculate_checkpoint_risk({"rain": 0.40}, 10000), "High")
        self.assertEqual(calculate_checkpoint_risk({"rain": 0.70}, 10000), "Severe")
        self.assertEqual(calculate_checkpoint_risk({"rain": 1.10}, 10000), "No Travel")

    def test_snow_thresholds(self):
        self.assertEqual(calculate_checkpoint_risk({"snow": 0.1}, 10000), "Low")
        self.assertEqual(calculate_checkpoint_risk({"snow": 0.7}, 10000), "Moderate")
        self.assertEqual(calculate_checkpoint_risk({"snow": 1.5}, 10000), "High")
        self.assertEqual(calculate_checkpoint_risk({"snow": 2.5}, 10000), "Severe")
        self.assertEqual(calculate_checkpoint_risk({"snow": 3.5}, 10000), "No Travel")

    def test_load_overrides(self):
        self.assertEqual(
            calculate_checkpoint_risk({"wind": 55}, 10000), "No Travel"
        )
        self.assertEqual(
            calculate_checkpoint_risk({"wind": 50}, 35000), "No Travel"
        )
        self.assertEqual(
            calculate_checkpoint_risk({"wind": 50}, 25000), "Severe"
        )
        self.assertEqual(
            calculate_checkpoint_risk({"wind": 40}, 45000), "Severe"
        )
        self.assertEqual(
            calculate_checkpoint_risk({"wind": 40}, 35000), "High"
        )

    def test_highest_hazard_wins(self):
        self.assertEqual(
            calculate_checkpoint_risk(
                {"wind": 30, "rain": 0.40, "snow": 0.1}, 10000
            ),
            "High",
        )
