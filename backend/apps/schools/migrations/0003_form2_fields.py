from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("schools", "0002_form1_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="school",
            name="form2_submitted",
            field=models.BooleanField(
                default=False,
                help_text="Set once Schools Contact Info (Form 2) has been submitted for this school.",
            ),
        ),
        migrations.AddField(
            model_name="school",
            name="form2_submitted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
