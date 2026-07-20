from uuid import UUID

from django.test import SimpleTestCase

from .domain.icon import ANIMALS, PALETTE, TEXT_COLOR, generate_default_icon


class DefaultIconTests(SimpleTestCase):
    def test_generation_is_stable_and_uses_supported_values(self):
        stable_id = UUID("390fd998-2609-4a3c-8c3a-2e299d407f7c")

        first = generate_default_icon(stable_id)
        second = generate_default_icon(stable_id)

        self.assertEqual(first, second)
        self.assertIn(first.text, ANIMALS)
        self.assertIn(first.background_color, PALETTE)
        self.assertEqual(first.text_color, TEXT_COLOR)

    def test_animal_and_background_use_independent_hash_bytes(self):
        first = generate_default_icon(UUID("390fd998-2609-4a3c-8c3a-2e299d407f7c"))
        second = generate_default_icon(UUID("00000000-0000-0000-0000-000000000001"))

        self.assertNotEqual(
            (first.text, first.background_color),
            (second.text, second.background_color),
        )

    def test_palette_contains_only_the_approved_non_blue_pastels(self):
        self.assertEqual(
            PALETTE,
            (
                "#F7D9C4",
                "#F4C7C3",
                "#E8D5F2",
                "#F6E3A1",
                "#DDE5B6",
                "#E7D7C9",
                "#F2CEDA",
                "#DCCFBF",
            ),
        )
