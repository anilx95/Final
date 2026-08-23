"""
AI Visual Learning Engine Service.
Generates structured interactive diagrams (SVG/Graph), concept maps, and rich audio descriptions for WCAG 2.2 accessibility.
Runs automatically synchronized with live teacher speech.
"""

import json
import logging
import re
import urllib.request
from typing import Dict, Any, List, Optional
from app.services.translation_service import translation_service

logger = logging.getLogger(__name__)

# Curated library of interactive structured visual models across key educational subjects
PRESET_DIAGRAMS: Dict[str, Dict[str, Any]] = {
    "water cycle": {
        "id": "water_cycle",
        "title": "The Water Cycle (Hydrological Cycle)",
        "subject": "Geography / Environmental Science",
        "type": "cycle",
        "keywords": ["water cycle", "evaporation", "condensation", "precipitation", "hydrological", "runoff", "clouds", "rain"],
        "audio_description": "The water cycle is a continuous closed-loop system with four main stages. Solar heat causes evaporation from oceans and lakes. Rising water vapor cools and condenses into clouds. Precipitation falls as rain and snow, and surface runoff collects back into water bodies.",
        "nodes": [
            {"id": "evaporation", "label": "Evaporation", "desc": "Solar energy warms water bodies, converting liquid water into rising vapor.", "x": 150, "y": 280, "icon": "☀️", "color": "#f59e0b", "match_words": ["evaporat", "solar", "vapor", "heat", "steam"]},
            {"id": "condensation", "label": "Condensation", "desc": "Water vapor rises and cools at high altitude, forming dense clouds.", "x": 300, "y": 80, "icon": "☁️", "color": "#38bdf8", "match_words": ["condens", "cloud", "cool", "altitude", "droplet"]},
            {"id": "precipitation", "label": "Precipitation", "desc": "Water droplets in clouds become heavy and fall as rain, snow, or hail.", "x": 450, "y": 180, "icon": "🌧️", "color": "#6366f1", "match_words": ["precipitat", "rain", "snow", "hail", "fall", "storm"]},
            {"id": "collection", "label": "Collection & Runoff", "desc": "Water collects in rivers, lakes, oceans, and groundwater reservoirs.", "x": 300, "y": 340, "icon": "🌊", "color": "#06b6d4", "match_words": ["collect", "runoff", "river", "ocean", "lake", "groundwater"]},
        ],
        "links": [
            {"from": "evaporation", "to": "condensation", "label": "Vapor Rises"},
            {"from": "condensation", "to": "precipitation", "label": "Drops Fall"},
            {"from": "precipitation", "to": "collection", "label": "Ground Absorption"},
            {"from": "collection", "to": "evaporation", "label": "Solar Re-heating"},
        ],
    },
    "plant cell": {
        "id": "plant_cell",
        "title": "Plant Cell Structure & Organelles",
        "subject": "Biology",
        "type": "anatomy",
        "keywords": ["plant cell", "cell wall", "chloroplast", "vacuole", "mitochondria", "organelle", "cytoplasm"],
        "audio_description": "An interactive diagram of a plant cell featuring a rigid outer cell wall, a large central vacuole for turgor pressure, green chloroplasts for photosynthesis, a central nucleus containing genetic material, and mitochondria for ATP cellular respiration.",
        "nodes": [
            {"id": "nucleus", "label": "Nucleus", "desc": "The control center of the cell containing DNA and chromosomes.", "x": 300, "y": 200, "icon": "🧬", "color": "#ec4899", "match_words": ["nucleus", "dna", "gene", "chromosome", "control center"]},
            {"id": "cell_wall", "label": "Cell Wall", "desc": "Rigid cellulose outer layer providing structural integrity and protection.", "x": 120, "y": 100, "icon": "🛡️", "color": "#10b981", "match_words": ["cell wall", "cellulose", "rigid", "membrane", "outer"]},
            {"id": "chloroplast", "label": "Chloroplasts", "desc": "Organelles containing chlorophyll where photosynthesis converts sunlight to glucose.", "x": 450, "y": 120, "icon": "🍃", "color": "#22c55e", "match_words": ["chloroplast", "chlorophyll", "photosynthe", "sunlight", "glucose"]},
            {"id": "vacuole", "label": "Central Vacuole", "desc": "Large fluid-filled organelle maintaining cellular turgor pressure.", "x": 220, "y": 280, "icon": "💧", "color": "#0ea5e9", "match_words": ["vacuole", "turgor", "fluid", "pressure", "water storage"]},
            {"id": "mitochondria", "label": "Mitochondria", "desc": "Powerhouse of the cell generating ATP energy through respiration.", "x": 420, "y": 290, "icon": "⚡", "color": "#f97316", "match_words": ["mitochondri", "powerhouse", "atp", "respiration", "energy"]},
        ],
        "links": [
            {"from": "cell_wall", "to": "nucleus", "label": "Encapsulates"},
            {"from": "chloroplast", "to": "mitochondria", "label": "Supplies Glucose"},
            {"from": "vacuole", "to": "cell_wall", "label": "Turgor Support"},
        ],
    },
    "newton laws": {
        "id": "newton_laws",
        "title": "Newton's Laws of Motion & Forces",
        "subject": "Physics",
        "type": "concept_map",
        "keywords": ["newton", "laws of motion", "inertia", "f=ma", "action reaction", "force", "acceleration", "gravity"],
        "audio_description": "Force diagram illustrating Newton's 3 laws: Law 1 (Inertia - constant velocity unless net external force acts), Law 2 (F equals m a - force equals mass times acceleration), and Law 3 (Action-Reaction - equal and opposite force pairs).",
        "nodes": [
            {"id": "law1", "label": "1st Law: Inertia", "desc": "An object at rest stays at rest, and an object in motion stays in motion at constant velocity unless acted upon by a net external force.", "x": 150, "y": 120, "icon": "🛑", "color": "#8b5cf6", "match_words": ["inertia", "first law", "rest", "constant velocity", "net force"]},
            {"id": "law2", "label": "2nd Law: F = m × a", "desc": "Force equals mass multiplied by acceleration. Acceleration is directly proportional to net force and inversely proportional to mass.", "x": 300, "y": 220, "icon": "🚀", "color": "#3b82f6", "match_words": ["second law", "f=ma", "mass", "acceleration", "proportional"]},
            {"id": "law3", "label": "3rd Law: Action & Reaction", "desc": "For every action force exerted on a body, there is an equal in magnitude and opposite in direction reaction force.", "x": 450, "y": 120, "icon": "⚖️", "color": "#ec4899", "match_words": ["third law", "action", "reaction", "equal opposite", "pairs"]},
        ],
        "links": [
            {"from": "law1", "to": "law2", "label": "Defines Force"},
            {"from": "law2", "to": "law3", "label": "Force Pairs"},
        ],
    },
    "neural network": {
        "id": "neural_network",
        "title": "Artificial Neural Network Architecture",
        "subject": "Computer Science / AI",
        "type": "flowchart",
        "keywords": ["neural network", "deep learning", "artificial intelligence", "hidden layer", "backpropagation", "activation", "weights"],
        "audio_description": "Deep learning neural network flowchart showing an Input Layer receiving raw feature vectors, Hidden Layers performing non-linear matrix multiplications and ReLU activation, and an Output Layer computing softmax classification probabilities.",
        "nodes": [
            {"id": "input_layer", "label": "Input Layer", "desc": "Accepts raw feature vectors (pixels, audio, text embeddings).", "x": 120, "y": 200, "icon": "📥", "color": "#6366f1", "match_words": ["input", "feature", "vector", "pixel", "embedding"]},
            {"id": "hidden_layers", "label": "Hidden Deep Layers", "desc": "Applies learned weights, biases, and activation functions (ReLU, GELU).", "x": 300, "y": 200, "icon": "🧠", "color": "#a855f7", "match_words": ["hidden", "weight", "bias", "activation", "relu", "layer"]},
            {"id": "output_layer", "label": "Output Predictions", "desc": "Produces final probabilities using Softmax or linear regression.", "x": 480, "y": 200, "icon": "📊", "color": "#10b981", "match_words": ["output", "prediction", "softmax", "probability", "loss", "classification"]},
        ],
        "links": [
            {"from": "input_layer", "to": "hidden_layers", "label": "Forward Weights (W₁)"},
            {"from": "hidden_layers", "to": "output_layer", "label": "Activations (W₂)"},
        ],
    },
    "photosynthesis": {
        "id": "photosynthesis",
        "title": "Photosynthesis Biochemical Pathway",
        "subject": "Chemistry / Biology",
        "keywords": ["photosynthesis", "chlorophyll", "calvin cycle", "light reaction", "glucose", "stoma", "thylakoid"],
        "type": "cycle",
        "audio_description": "Chemical process in plant chloroplasts where 6 molecules of carbon dioxide and 6 molecules of water combine with light energy to produce 1 molecule of glucose and 6 oxygen gas molecules.",
        "nodes": [
            {"id": "sunlight", "label": "Sunlight & Photons", "desc": "Light energy absorbed by chlorophyll pigments.", "x": 150, "y": 100, "icon": "☀️", "color": "#f59e0b", "match_words": ["sunlight", "photon", "light energy", "solar", "pigment"]},
            {"id": "reactants", "label": "CO₂ + H₂O Reactants", "desc": "Carbon dioxide from air and water absorbed through roots.", "x": 150, "y": 280, "icon": "💧", "color": "#06b6d4", "match_words": ["co2", "carbon dioxide", "water", "h2o", "reactant", "root"]},
            {"id": "chloroplast", "label": "Chloroplast Thylakoids", "desc": "Light-dependent reactions generate ATP and NADPH.", "x": 320, "y": 190, "icon": "🍃", "color": "#22c55e", "match_words": ["thylakoid", "chloroplast", "light reaction", "atp", "nadph"]},
            {"id": "calvin_cycle", "label": "Calvin Cycle & Glucose", "desc": "Light-independent carbon fixation synthesis of C₆H₁₂O₆ (Glucose).", "x": 480, "y": 190, "icon": "🍬", "color": "#ec4899", "match_words": ["calvin", "glucose", "sugar", "carbon fixation", "c6h12o6", "dark reaction"]},
        ],
        "links": [
            {"from": "sunlight", "to": "chloroplast", "label": "Light Energy"},
            {"from": "reactants", "to": "chloroplast", "label": "Chemical Inputs"},
            {"from": "chloroplast", "to": "calvin_cycle", "label": "ATP & NADPH"},
        ],
    },
    "electric circuit": {
        "id": "electric_circuit",
        "title": "Electric Circuit & Ohm's Law (V = I × R)",
        "subject": "Physics / Electrical Engineering",
        "keywords": ["circuit", "ohm", "voltage", "current", "resistor", "resistance", "amperes", "volts", "battery"],
        "type": "circuit",
        "audio_description": "A closed loop DC electric circuit diagram illustrating the relationship between Voltage from a DC Battery, Current flowing through copper conductors, and Resistance across a load resistor according to Ohm's Law.",
        "nodes": [
            {"id": "voltage_source", "label": "Voltage Source (V)", "desc": "DC battery establishing electrical potential difference measured in Volts.", "x": 140, "y": 200, "icon": "🔋", "color": "#eab308", "match_words": ["voltage", "battery", "potential", "volts", "source"]},
            {"id": "current_flow", "label": "Current Flow (I)", "desc": "Rate of electron flow through conductors measured in Amperes.", "x": 300, "y": 90, "icon": "⚡", "color": "#38bdf8", "match_words": ["current", "amperes", "amps", "electron", "flow", "charge"]},
            {"id": "resistor_load", "label": "Resistor Load (R)", "desc": "Component opposing current flow and converting energy to heat/light measured in Ohms.", "x": 460, "y": 200, "icon": "💡", "color": "#f97316", "match_words": ["resistor", "resistance", "ohms", "load", "oppose"]},
            {"id": "ground_return", "label": "Ground Reference (0V)", "desc": "Common return path completing the closed circuit loop.", "x": 300, "y": 310, "icon": "⏚", "color": "#a855f7", "match_words": ["ground", "closed loop", "return", "0v", "earth"]},
        ],
        "links": [
            {"from": "voltage_source", "to": "current_flow", "label": "Pushes Charge"},
            {"from": "current_flow", "to": "resistor_load", "label": "Powers Load"},
            {"from": "resistor_load", "to": "ground_return", "label": "Return Current"},
            {"from": "ground_return", "to": "voltage_source", "label": "Closes Loop"},
        ],
    },
    "dna structure": {
        "id": "dna_structure",
        "title": "DNA Double Helix & Base Pairing",
        "subject": "Genetics / Molecular Biology",
        "keywords": ["dna", "double helix", "nucleotide", "adenine", "thymine", "cytosine", "guanine", "codon", "genetic"],
        "type": "concept_map",
        "audio_description": "Molecular structure diagram of DNA double helix showing antiparallel sugar-phosphate backbones connected by hydrogen bonds between complementary base pairs Adenine-Thymine and Guanine-Cytosine.",
        "nodes": [
            {"id": "backbone", "label": "Sugar-Phosphate Backbone", "desc": "Structural framework consisting of alternating deoxyribose sugar and phosphate groups.", "x": 150, "y": 140, "icon": "🧬", "color": "#06b6d4", "match_words": ["backbone", "phosphate", "sugar", "deoxyribose", "strand"]},
            {"id": "base_pairs", "label": "A-T & G-C Base Pairs", "desc": "Adenine pairs with Thymine (2 H-bonds); Guanine pairs with Cytosine (3 H-bonds).", "x": 310, "y": 200, "icon": "🔗", "color": "#ec4899", "match_words": ["adenine", "thymine", "guanine", "cytosine", "base pair", "nucleotide"]},
            {"id": "hydrogen_bonds", "label": "Hydrogen Bonding", "desc": "Weak chemical bonds holding the two complementary strands together in a double helix.", "x": 470, "y": 140, "icon": "✨", "color": "#8b5cf6", "match_words": ["hydrogen bond", "complementary", "helix", "bond"]},
            {"id": "genetic_code", "label": "Codons & Gene Expression", "desc": "Triplet nucleotide sequences encoding 20 standard amino acids for protein synthesis.", "x": 310, "y": 320, "icon": "📜", "color": "#10b981", "match_words": ["codon", "gene", "transcription", "translation", "amino acid", "protein"]},
        ],
        "links": [
            {"from": "backbone", "to": "base_pairs", "label": "Attaches To"},
            {"from": "base_pairs", "to": "hydrogen_bonds", "label": "Stabilized By"},
            {"from": "base_pairs", "to": "genetic_code", "label": "Transcribes Into"},
        ],
    },
    "solar system": {
        "id": "solar_system",
        "title": "Solar System Planetary Orbits & Gravity",
        "subject": "Astronomy / Physics",
        "keywords": ["solar system", "planet", "orbit", "gravity", "sun", "jupiter", "saturn", "mars", "earth"],
        "type": "cycle",
        "audio_description": "Gravitational orbital diagram showing the Sun at the center holding Terrestrial planets (Mercury, Venus, Earth, Mars) and Gas Giants (Jupiter, Saturn, Uranus, Neptune) in elliptical orbits via gravitational pull.",
        "nodes": [
            {"id": "sun_core", "label": "The Sun (Central Mass)", "desc": "Contains 99.8% of solar system mass, providing gravitational anchor and radiant energy.", "x": 140, "y": 200, "icon": "☀️", "color": "#f59e0b", "match_words": ["sun", "star", "solar", "gravity", "mass"]},
            {"id": "inner_planets", "label": "Terrestrial Planets", "desc": "Dense, rocky worlds with solid surfaces: Mercury, Venus, Earth, Mars.", "x": 280, "y": 110, "icon": "🌍", "color": "#38bdf8", "match_words": ["mercury", "venus", "earth", "mars", "rocky", "terrestrial"]},
            {"id": "asteroid_belt", "label": "Asteroid Belt", "desc": "Circumstellar disc separating rocky inner planets from outer gas giants.", "x": 420, "y": 200, "icon": "☄️", "color": "#a1a1aa", "match_words": ["asteroid", "belt", "ceres", "meteor"]},
            {"id": "outer_giants", "label": "Gas & Ice Giants", "desc": "Massive gaseous worlds: Jupiter, Saturn, Uranus, Neptune.", "x": 280, "y": 290, "icon": "🪐", "color": "#c084fc", "match_words": ["jupiter", "saturn", "uranus", "neptune", "gas giant", "rings"]},
        ],
        "links": [
            {"from": "sun_core", "to": "inner_planets", "label": "Gravitational Orbit"},
            {"from": "inner_planets", "to": "asteroid_belt", "label": "Orbital Boundary"},
            {"from": "asteroid_belt", "to": "outer_giants", "label": "Outer System"},
            {"from": "outer_giants", "to": "sun_core", "label": "Solar Orbit Cycle"},
        ],
    },
    "mitosis": {
        "id": "mitosis",
        "title": "Mitosis Cell Division Stages",
        "subject": "Biology / Genetics",
        "keywords": ["mitosis", "cell division", "prophase", "metaphase", "anaphase", "telophase", "cytokinesis", "spindle"],
        "type": "flowchart",
        "audio_description": "Cellular division cycle detailing Prophase (chromosome condensation), Metaphase (equatorial alignment), Anaphase (chromatid separation to poles), and Telophase/Cytokinesis (daughter cell formation).",
        "nodes": [
            {"id": "prophase", "label": "1. Prophase", "desc": "Chromatin condenses into distinct chromosomes and nuclear envelope breaks down.", "x": 130, "y": 120, "icon": "🔬", "color": "#8b5cf6", "match_words": ["prophase", "chromatin", "condens", "nuclear envelope"]},
            {"id": "metaphase", "label": "2. Metaphase", "desc": "Chromosomes line up along the cell equatorial metaphase plate attached by spindle fibers.", "x": 300, "y": 120, "icon": "📏", "color": "#3b82f6", "match_words": ["metaphase", "equator", "line up", "middle", "spindle"]},
            {"id": "anaphase", "label": "3. Anaphase", "desc": "Sister chromatids are pulled apart toward opposite poles by spindle fibers.", "x": 470, "y": 120, "icon": "✂️", "color": "#ec4899", "match_words": ["anaphase", "pull apart", "separate", "poles", "chromatid"]},
            {"id": "telophase", "label": "4. Telophase & Cytokinesis", "desc": "Nuclear envelopes reform around separated DNA, and cytoplasm divides into two identical daughter cells.", "x": 300, "y": 280, "icon": "🌱", "color": "#10b981", "match_words": ["telophase", "cytokinesis", "daughter cell", "divide", "two cells"]},
        ],
        "links": [
            {"from": "prophase", "to": "metaphase", "label": "Alignment"},
            {"from": "metaphase", "to": "anaphase", "label": "Separation"},
            {"from": "anaphase", "to": "telophase", "label": "Cleavage"},
        ],
    },
    "circulatory system": {
        "id": "circulatory_system",
        "title": "Human Heart & Circulatory System",
        "subject": "Human Anatomy / Biology",
        "keywords": ["heart", "circulatory", "blood", "atrium", "ventricle", "aorta", "artery", "vein", "oxygenated"],
        "type": "cycle",
        "audio_description": "Cardiovascular circulation pathway: Deoxygenated blood enters the Right Atrium/Ventricle, is pumped to the Lungs for oxygenation, returns to the Left Atrium/Ventricle, and is ejected through the Aorta to systemic circulation.",
        "nodes": [
            {"id": "right_heart", "label": "Right Atrium & Ventricle", "desc": "Receives deoxygenated venous blood from the body and pumps it to the pulmonary artery.", "x": 140, "y": 200, "icon": "💙", "color": "#3b82f6", "match_words": ["right atrium", "right ventricle", "deoxygenated", "venous", "tricuspid"]},
            {"id": "lungs_oxygenation", "label": "Pulmonary Gas Exchange", "desc": "Alveoli in lungs release CO2 and enrich red blood cells with fresh Oxygen (O2).", "x": 300, "y": 90, "icon": "🫁", "color": "#06b6d4", "match_words": ["pulmonary", "lungs", "alveoli", "oxygen", "gas exchange", "co2"]},
            {"id": "left_heart", "label": "Left Atrium & Ventricle", "desc": "Powerful muscular chamber receiving oxygenated blood and preparing for systemic ejection.", "x": 460, "y": 200, "icon": "❤️", "color": "#ef4444", "match_words": ["left atrium", "left ventricle", "bicuspid", "mitral", "oxygenated"]},
            {"id": "aorta_body", "label": "Aorta & Systemic Tissues", "desc": "High pressure distribution of oxygen and nutrients to organs and working muscles.", "x": 300, "y": 320, "icon": "🩸", "color": "#f97316", "match_words": ["aorta", "arteries", "systemic", "tissue", "organs", "capillary"]},
        ],
        "links": [
            {"from": "right_heart", "to": "lungs_oxygenation", "label": "Pulmonary Artery"},
            {"from": "lungs_oxygenation", "to": "left_heart", "label": "Pulmonary Vein"},
            {"from": "left_heart", "to": "aorta_body", "label": "Aortic Ejection"},
            {"from": "aorta_body", "to": "right_heart", "label": "Vena Cava Return"},
        ],
    },
}


class VisualEngineService:
    @classmethod
    def _extract_dynamic_concept_nodes(cls, topic: str, speech_text: str, subject: str) -> Dict[str, Any]:
        """
        Dynamically extracts structured educational nodes and relationships
        based on the actual speech/transcript of the lecture.
        """
        title = topic.strip().title() if topic.strip() else "Core Lecture Concept"
        text = (speech_text or "").strip()

        # Extract meaningful clauses / phrases from speech
        sentences = [s.strip() for s in re.split(r'[.!?,\n]', text) if len(s.strip().split()) >= 3]
        
        # Color palette for nodes
        palette = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"]
        icons = ["💡", "⚙️", "🔬", "🚀", "🎯", "📊"]

        node_positions = [
            {"x": 140, "y": 190},
            {"x": 300, "y": 90},
            {"x": 460, "y": 190},
            {"x": 300, "y": 310},
        ]

        nodes = []
        if sentences and len(sentences) >= 2:
            # Build nodes from actual spoken phrases
            for idx, sent in enumerate(sentences[:4]):
                words = sent.split()
                node_label = " ".join(words[:4]).title()
                pos = node_positions[idx % len(node_positions)]
                nodes.append({
                    "id": f"node_{idx + 1}",
                    "label": node_label,
                    "desc": sent,
                    "x": pos["x"],
                    "y": pos["y"],
                    "icon": icons[idx % len(icons)],
                    "color": palette[idx % len(palette)],
                    "match_words": [w.lower() for w in words[:6] if len(w) > 3],
                })
        else:
            # Domain-specific default stages based on the topic name
            stages = [
                (f"{title} Definition", f"Core foundational principles and definition of {topic}."),
                ("Governing Principles", f"Fundamental mechanisms, variables, and interactions governing {topic}."),
                ("Practical Application", f"Real-world engineering, scientific problem solving, or analytical application of {topic}."),
                ("Mastery Outcomes", f"Key synthesis, takeaways, and exam mastery benchmarks for {topic}."),
            ]
            for idx, (lbl, desc) in enumerate(stages):
                pos = node_positions[idx % len(node_positions)]
                nodes.append({
                    "id": f"node_{idx + 1}",
                    "label": lbl,
                    "desc": desc,
                    "x": pos["x"],
                    "y": pos["y"],
                    "icon": icons[idx % len(icons)],
                    "color": palette[idx % len(palette)],
                    "match_words": [w.lower() for w in lbl.split() if len(w) > 3],
                })

        links = [
            {"from": nodes[0]["id"], "to": nodes[1]["id"], "label": "Progresses To"},
            {"from": nodes[1]["id"], "to": nodes[2]["id"], "label": "Applies To"},
        ]
        if len(nodes) >= 4:
            links.append({"from": nodes[2]["id"], "to": nodes[3]["id"], "label": "Leads To"})
            links.append({"from": nodes[3]["id"], "to": nodes[0]["id"], "label": "Reinforces"})

        return {
            "id": f"diagram_{abs(hash(title + text[:30])) % 10000}",
            "title": f"{title} Concept Map",
            "subject": subject or "General Science",
            "type": "concept_map",
            "audio_description": f"An interactive conceptual diagram detailing the foundational components, properties, and relationships of {title}. " + (text[:180] if text else ""),
            "nodes": nodes,
            "links": links,
        }

    @classmethod
    def find_or_generate_diagram(
        cls,
        topic: str = "",
        transcript: str = "",
        subject: str = "General",
        target_lang: str = "en",
    ) -> Dict[str, Any]:
        """Finds matching visual model or synthesizes structured diagram from topic & transcript."""
        combined_text = f"{topic} {transcript}".lower().strip()

        # 1. Check curated preset diagrams by keyword & topic matching
        matched_diagram = None
        for key, diagram in PRESET_DIAGRAMS.items():
            keywords = diagram.get("keywords", [key])
            if (
                key in combined_text
                or any(k in combined_text for k in keywords)
                or any(w in combined_text.split() for w in key.split() if len(w) > 3)
            ):
                matched_diagram = json.loads(json.dumps(diagram))
                break

        # 2. Dynamic content-driven structured diagram if not in curated presets
        if not matched_diagram:
            matched_diagram = cls._extract_dynamic_concept_nodes(topic, transcript, subject)

        # 3. If target language is non-English, localize node labels & audio description
        if target_lang and target_lang.lower() not in ("en", "english"):
            for node in matched_diagram.get("nodes", []):
                trans_label = translation_service.translate(node["label"], target_lang)
                if trans_label:
                    node["translated_label"] = trans_label
                trans_desc = translation_service.translate(node["desc"], target_lang)
                if trans_desc:
                    node["translated_desc"] = trans_desc

            audio_desc = matched_diagram.get("audio_description", "")
            if audio_desc:
                trans_audio = translation_service.translate(audio_desc, target_lang)
                if trans_audio:
                    matched_diagram["translated_audio_description"] = trans_audio

        return matched_diagram


visual_engine_service = VisualEngineService()
