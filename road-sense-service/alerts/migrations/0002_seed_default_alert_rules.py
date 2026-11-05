"""
Seed the default alert rules evaluated by alerts.tasks.check_alert_conditions.

Message templates use the placeholders that _evaluate_alert_rule passes in:
TIRE_WEAR -> {degradation_rate}, FUEL_LOW -> {laps_remaining},
STRATEGY_OPPORTUNITY -> {position}, {gap}.
"""
from django.db import migrations

DEFAULT_RULES = [
    {
        "name": "High tire degradation",
        "alert_type": "TIRE_WEAR",
        "severity": "HIGH",
        "condition": {"metric": "grip_loss_rate", "operator": ">", "threshold": 0.12},
        "message_template": "Lap times are dropping by {degradation_rate:.3f}s per lap on the current tires.",
        "action_template": "Plan a pit stop within the next few laps.",
    },
    {
        "name": "Low fuel",
        "alert_type": "FUEL_LOW",
        "severity": "HIGH",
        "condition": {"metric": "fuel_laps_remaining", "operator": "<", "threshold": 8},
        "message_template": "Estimated fuel for {laps_remaining} more laps.",
        "action_template": "Prepare a fuel stop or switch to fuel-saving mode.",
    },
    {
        "name": "Attack opportunity",
        "alert_type": "STRATEGY_OPPORTUNITY",
        "severity": "MEDIUM",
        "condition": {"metric": "position", "operator": "in", "value": [2, 3, 4], "max_gap_to_leader": 5.0},
        "message_template": "P{position}, {gap:.1f}s behind the leader.",
        "action_template": "Consider an undercut at the next pit window.",
    },
]


def seed_rules(apps, schema_editor):
    AlertRule = apps.get_model("alerts", "AlertRule")
    for rule in DEFAULT_RULES:
        AlertRule.objects.get_or_create(
            name=rule["name"],
            alert_type=rule["alert_type"],
            defaults={**rule, "is_active": True},
        )


def remove_rules(apps, schema_editor):
    AlertRule = apps.get_model("alerts", "AlertRule")
    for rule in DEFAULT_RULES:
        AlertRule.objects.filter(name=rule["name"], alert_type=rule["alert_type"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("alerts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_rules, remove_rules),
    ]
