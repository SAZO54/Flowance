from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0002_user_settings")]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="family_name",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AlterField(
            model_name="user",
            name="given_name",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AlterField(
            model_name="user",
            name="phone_number",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
    ]
