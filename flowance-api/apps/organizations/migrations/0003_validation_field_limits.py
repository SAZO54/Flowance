from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("organizations", "0002_organizationbusinessprofile")]

    operations = [
        migrations.AlterField(
            model_name="organizationbusinessprofile",
            name="postal_code",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.AlterField(
            model_name="organizationbusinessprofile",
            name="address",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
    ]
