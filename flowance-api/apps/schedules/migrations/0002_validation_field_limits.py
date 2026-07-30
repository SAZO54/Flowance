from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("schedules", "0001_initial")]

    operations = [
        migrations.AlterField(
            model_name="workschedule",
            name="title",
            field=models.CharField(max_length=200),
        ),
    ]
