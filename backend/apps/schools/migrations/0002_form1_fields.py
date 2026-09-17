from django.db import migrations, models

SMART_BOARD_CHOICES = [
    ("yes", "Yes"),
    ("no", "No"),
    ("yes_not_working", "Yes but not working"),
]


def _copy_smart_board_forward(apps, schema_editor):
    """Old smart_board was a nullable bool; new one is a 3-choice string.
    True -> "yes", False -> "no", NULL -> "" (there's no way to recover
    "yes_not_working" from a plain bool -- any legacy data with that
    nuance was never captured under the old column)."""
    School = apps.get_model("schools", "School")
    for school in School.objects.all().only("id", "smart_board"):
        if school.smart_board is True:
            value = "yes"
        elif school.smart_board is False:
            value = "no"
        else:
            value = ""
        School.objects.filter(pk=school.pk).update(smart_board_tmp=value)


def _copy_smart_board_backward(apps, schema_editor):
    School = apps.get_model("schools", "School")
    for school in School.objects.all().only("id", "smart_board_tmp"):
        School.objects.filter(pk=school.pk).update(smart_board=school.smart_board_tmp == "yes")


class Migration(migrations.Migration):

    dependencies = [
        ("schools", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="school",
            name="form1_submitted",
            field=models.BooleanField(
                default=False,
                help_text="Set once School Enrollment Form 1 has been submitted for this school.",
            ),
        ),
        migrations.AddField(
            model_name="school",
            name="form1_submitted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="school",
            name="smart_board_tmp",
            field=models.CharField(blank=True, choices=SMART_BOARD_CHOICES, default="", max_length=20),
        ),
        migrations.RunPython(_copy_smart_board_forward, _copy_smart_board_backward),
        migrations.RemoveField(
            model_name="school",
            name="smart_board",
        ),
        migrations.RenameField(
            model_name="school",
            old_name="smart_board_tmp",
            new_name="smart_board",
        ),
    ]
