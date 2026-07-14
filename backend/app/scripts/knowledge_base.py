"""
Curated reference material for the pneumonia knowledge base.

This is original, educational content written to ground the report-generation
and chat features - it deliberately avoids prescriptive dosing, diagnostic
certainty, or anything that could substitute for clinical judgment. Each
entry pairs a chunk of text with a source label (used for citations) and an
optional topic tag.

In a production system this would be replaced/supplemented by properly
licensed medical literature (PubMed abstracts, radiology textbooks with
permission, clinical guidelines you have rights to redistribute) - this
curated set exists to make the RAG pipeline functionally complete for the
MVP without any copyright risk.
"""

KNOWLEDGE_CHUNKS = [
    {
        "title": "What pneumonia is",
        "source": "RadIntel Reference Notes",
        "text": (
            "Pneumonia is an infection that inflames the air sacs in one or both lungs, which can "
            "fill with fluid or pus. It can be caused by bacteria, viruses, or fungi, and severity "
            "ranges from mild to life-threatening depending on the organism, the patient's age, and "
            "their overall health."
        ),
    },
    {
        "title": "Common causative organisms",
        "source": "RadIntel Reference Notes",
        "text": (
            "Bacterial pneumonia is often caused by Streptococcus pneumoniae, and tends to produce a "
            "more localized, lobar pattern on imaging. Viral pneumonia, including influenza and "
            "SARS-CoV-2, more often produces a diffuse or bilateral pattern. Atypical organisms such "
            "as Mycoplasma pneumoniae can cause a milder illness sometimes called 'walking pneumonia,' "
            "with subtler radiographic findings than typical bacterial pneumonia."
        ),
    },
    {
        "title": "Consolidation on chest X-ray",
        "source": "RadIntel Reference Notes",
        "text": (
            "Consolidation refers to lung tissue that has filled with fluid, pus, or other material "
            "instead of air, which appears as a dense white area on a chest X-ray. This is one of the "
            "most common findings associated with bacterial pneumonia and typically corresponds to the "
            "region of active infection."
        ),
    },
    {
        "title": "Air bronchograms",
        "source": "RadIntel Reference Notes",
        "text": (
            "Air bronchograms appear when air-filled airways stand out as dark branching lines against "
            "surrounding consolidated, fluid-filled lung tissue. Their presence supports a diagnosis of "
            "pneumonia or another process filling the air sacs, as opposed to a mass or collapsed lung."
        ),
    },
    {
        "title": "Lobar versus interstitial patterns",
        "source": "RadIntel Reference Notes",
        "text": (
            "A lobar pattern describes consolidation confined to a single lobe of the lung, classically "
            "associated with typical bacterial pneumonia. An interstitial pattern instead shows a "
            "fine, lace-like or hazy appearance spread more diffusely, which is more commonly seen with "
            "viral or atypical pneumonia, and can be harder to distinguish from other causes of lung "
            "haziness."
        ),
    },
    {
        "title": "Ground-glass opacities",
        "source": "RadIntel Reference Notes",
        "text": (
            "A ground-glass opacity is a hazy area of increased lung density that does not fully "
            "obscure the underlying blood vessels, distinguishing it from denser consolidation. "
            "Ground-glass patterns are frequently seen in viral pneumonias, including COVID-19, and can "
            "also occur in non-infectious conditions such as pulmonary edema or interstitial lung "
            "disease, so this finding alone is not specific to any single cause."
        ),
    },
    {
        "title": "COVID-19 associated pneumonia patterns",
        "source": "RadIntel Reference Notes",
        "text": (
            "COVID-19 pneumonia has been most classically associated with bilateral, peripheral "
            "ground-glass opacities, often affecting the lower lobes, sometimes progressing to more "
            "extensive consolidation in severe cases. Chest X-ray findings in early or mild COVID-19 "
            "infection can also be entirely normal, so a clear X-ray does not rule out infection."
        ),
    },
    {
        "title": "Distinguishing pneumonia from pulmonary edema",
        "source": "RadIntel Reference Notes",
        "text": (
            "Pulmonary edema from heart failure can mimic pneumonia on a chest X-ray, since both can "
            "cause hazy or consolidated-appearing lung fields. Clues favoring edema include an enlarged "
            "cardiac silhouette, prominent vessels near the lung hila, and fluid in the spaces around "
            "the lungs, whereas pneumonia more often shows a focal pattern without cardiac enlargement. "
            "Distinguishing the two often requires clinical context, not imaging alone."
        ),
    },
    {
        "title": "Pleural effusion as a complication",
        "source": "RadIntel Reference Notes",
        "text": (
            "A pleural effusion is a build-up of fluid in the space surrounding the lung, and can "
            "develop as a complication of pneumonia. On a chest X-ray, this typically appears as "
            "blunting of the normally sharp angle at the bottom of the lung field, and may require "
            "further evaluation if large or persistent."
        ),
    },
    {
        "title": "Severity assessment factors",
        "source": "RadIntel Reference Notes",
        "text": (
            "Clinical severity of pneumonia is generally assessed using a combination of factors "
            "beyond imaging alone, including the patient's age, vital signs, oxygen levels, blood "
            "test results, and the presence of confusion or existing health conditions. Extent and "
            "distribution of consolidation on imaging is one input into this assessment, not the sole "
            "determining factor."
        ),
    },
    {
        "title": "Risk factors for pneumonia",
        "source": "RadIntel Reference Notes",
        "text": (
            "Older adults, young children, smokers, and people with weakened immune systems or chronic "
            "conditions such as diabetes, heart disease, or chronic lung disease are at higher risk of "
            "developing pneumonia and of experiencing a more severe course of illness."
        ),
    },
    {
        "title": "Community-acquired versus hospital-acquired pneumonia",
        "source": "RadIntel Reference Notes",
        "text": (
            "Community-acquired pneumonia develops outside a hospital setting and is usually caused by "
            "a narrower range of common organisms. Hospital-acquired pneumonia develops during or "
            "shortly after a hospital stay and is more often associated with resistant organisms, which "
            "can influence how it is managed clinically."
        ),
    },
    {
        "title": "Aspiration pneumonia",
        "source": "RadIntel Reference Notes",
        "text": (
            "Aspiration pneumonia occurs when food, liquid, or stomach contents are inhaled into the "
            "lungs rather than swallowed normally, often affecting people with swallowing difficulties "
            "or reduced consciousness. On imaging, it frequently involves the lower or posterior lung "
            "segments, reflecting the effect of gravity on aspirated material."
        ),
    },
    {
        "title": "Pediatric presentation differences",
        "source": "RadIntel Reference Notes",
        "text": (
            "Pneumonia in children can present with different or more subtle radiographic findings "
            "than in adults, and clinical signs such as rapid breathing or difficulty feeding may be as "
            "important as imaging findings in assessing severity. Viral causes are relatively more "
            "common in young children compared with adults."
        ),
    },
    {
        "title": "Limitations of chest X-ray sensitivity",
        "source": "RadIntel Reference Notes",
        "text": (
            "Chest X-ray is a useful first-line imaging tool for suspected pneumonia, but it is not "
            "perfectly sensitive: early infection, certain organisms, or findings obscured by patient "
            "positioning or body habitus can result in a normal-appearing X-ray despite active "
            "infection. Persistent clinical suspicion despite a clear X-ray may warrant further "
            "evaluation."
        ),
    },
    {
        "title": "When CT imaging may be used",
        "source": "RadIntel Reference Notes",
        "text": (
            "When chest X-ray findings are equivocal, or when a complication or alternative diagnosis "
            "is suspected, CT imaging can provide more detailed information than a standard X-ray. CT "
            "is not typically the first-line test for uncomplicated suspected pneumonia due to higher "
            "cost and radiation exposure, but may be used selectively."
        ),
    },
    {
        "title": "General treatment approach overview",
        "source": "RadIntel Reference Notes",
        "text": (
            "Treatment for pneumonia depends on the suspected or confirmed cause: bacterial pneumonia "
            "is typically treated with antibiotics selected based on clinical guidelines and local "
            "resistance patterns, while viral pneumonia often focuses on supportive care such as rest, "
            "fluids, and fever management, with antiviral medications used for specific viruses when "
            "appropriate. Specific medication choice and dosing should always be determined by a "
            "treating clinician based on the individual patient."
        ),
    },
    {
        "title": "Follow-up imaging guidance",
        "source": "RadIntel Reference Notes",
        "text": (
            "Follow-up chest imaging is sometimes recommended several weeks after treatment, "
            "particularly for older adults, smokers, or those with risk factors for underlying lung "
            "conditions, to confirm resolution of the pneumonia and rule out an underlying mass that "
            "could have been obscured by the infection."
        ),
    },
    {
        "title": "The role of AI-assisted triage in radiology",
        "source": "RadIntel Reference Notes",
        "text": (
            "AI tools for chest X-ray review are generally designed to assist radiologists and "
            "clinicians by flagging studies that may need more urgent review or by highlighting regions "
            "of interest, rather than replacing the need for expert interpretation. Confidence scores "
            "produced by such models reflect the model's certainty based on its training data and "
            "should be interpreted alongside, not instead of, clinical judgment."
        ),
    },
    {
        "title": "Explaining radiology terms to patients",
        "source": "RadIntel Reference Notes",
        "text": (
            "Terms like 'opacity' or 'infiltrate' in a radiology report simply describe an area of the "
            "lung that appears denser or hazier than expected on imaging, which can have many possible "
            "causes including infection, fluid, or inflammation. These terms describe an appearance on "
            "the image, not a specific diagnosis by themselves, and are meant to be interpreted together "
            "with a patient's symptoms and other test results."
        ),
    },
    {
        "title": "Atelectasis",
        "source": "RadIntel Reference Notes",
        "text": (
            "Atelectasis refers to partial or complete collapse of part of the lung, which reduces the "
            "amount of air-filled tissue in that area and appears as increased density on a chest X-ray. "
            "It can result from an obstructed airway, external compression, or reduced lung expansion "
            "after surgery, and is frequently seen as a post-operative finding rather than indicating "
            "infection on its own."
        ),
    },
    {
        "title": "Cardiomegaly",
        "source": "RadIntel Reference Notes",
        "text": (
            "Cardiomegaly describes an enlarged heart silhouette on a chest X-ray, typically assessed by "
            "comparing the width of the heart to the width of the chest cavity. It can reflect underlying "
            "conditions such as heart failure, valve disease, or longstanding high blood pressure, and "
            "usually warrants correlation with an echocardiogram or other cardiac evaluation rather than "
            "being diagnosed from a chest X-ray alone."
        ),
    },
    {
        "title": "Pleural effusion appearance and causes",
        "source": "RadIntel Reference Notes",
        "text": (
            "A pleural effusion is fluid accumulation in the space surrounding the lung, appearing on a "
            "chest X-ray as blunting of the normally sharp costophrenic angle, or as a more extensive "
            "area of density at the base of the lung in larger effusions. Causes range from heart "
            "failure and infection to malignancy, so an effusion's significance depends heavily on the "
            "clinical context surrounding it, not the imaging finding alone."
        ),
    },
    {
        "title": "Infiltration as a radiographic finding",
        "source": "RadIntel Reference Notes",
        "text": (
            "Infiltration is a general term describing an area of the lung where normal air-filled tissue "
            "has been replaced by fluid, cells, or other material, appearing as a hazy or patchy area of "
            "increased density. It is a broad, nonspecific finding that can arise from infection, "
            "inflammation, fluid overload, or other processes, and typically requires clinical context to "
            "narrow down the likely cause."
        ),
    },
    {
        "title": "Pulmonary mass versus nodule",
        "source": "RadIntel Reference Notes",
        "text": (
            "A pulmonary mass is a discrete area of abnormal tissue in the lung generally larger than 3 "
            "centimeters, while a smaller such area is typically called a nodule. Both can have many "
            "causes ranging from benign processes like old scarring or infection to malignancy, and "
            "further evaluation, often with CT imaging or follow-up over time, is generally needed to "
            "characterize a newly identified mass or nodule rather than relying on X-ray appearance "
            "alone."
        ),
    },
    {
        "title": "Pulmonary nodules and follow-up",
        "source": "RadIntel Reference Notes",
        "text": (
            "A pulmonary nodule is a small, rounded area of increased density in the lung, often "
            "incidentally identified on imaging performed for another reason. Most nodules, especially "
            "small ones, turn out to be benign, but because a minority can represent early malignancy, "
            "guidelines generally recommend size- and risk-based follow-up imaging intervals rather than "
            "immediate biopsy for every nodule found."
        ),
    },
    {
        "title": "Pneumothorax",
        "source": "RadIntel Reference Notes",
        "text": (
            "A pneumothorax is air trapped in the space between the lung and the chest wall, causing part "
            "or all of the lung to collapse. On a chest X-ray, it appears as a visible line marking the "
            "edge of the collapsed lung, with absent lung markings in the space beyond it. A large or "
            "tension pneumothorax is a medical emergency requiring urgent intervention, making this one "
            "of the more time-sensitive findings an automated screening tool can flag."
        ),
    },
    {
        "title": "Pulmonary edema",
        "source": "RadIntel Reference Notes",
        "text": (
            "Pulmonary edema is fluid accumulation within the lung tissue itself, most often caused by "
            "heart failure, which increases pressure in the lungs' blood vessels and pushes fluid into "
            "the surrounding tissue. On chest X-ray it can produce a hazy, bilateral pattern sometimes "
            "described as a 'bat-wing' distribution, often accompanied by an enlarged cardiac silhouette "
            "and fluid in the pleural spaces."
        ),
    },
    {
        "title": "Emphysema",
        "source": "RadIntel Reference Notes",
        "text": (
            "Emphysema is a chronic condition, most often related to smoking, in which the air sacs of "
            "the lungs become damaged and enlarged, reducing the lung's ability to exchange oxygen "
            "efficiently. On chest X-ray, it can appear as flattened diaphragms, increased lung "
            "transparency, and a barrel-shaped chest, reflecting lungs that are chronically "
            "overinflated."
        ),
    },
    {
        "title": "Pulmonary fibrosis",
        "source": "RadIntel Reference Notes",
        "text": (
            "Pulmonary fibrosis is scarring of lung tissue that makes it stiffer and less able to expand "
            "normally, which can result from a wide range of causes including chronic inflammation, "
            "certain medications, environmental exposures, or be idiopathic with no clear identifiable "
            "cause. On imaging, it often appears as fine, reticular (net-like) markings, particularly "
            "toward the lower and outer parts of the lungs in its most common forms."
        ),
    },
    {
        "title": "Pleural thickening",
        "source": "RadIntel Reference Notes",
        "text": (
            "Pleural thickening refers to scarring or fibrosis of the pleura, the thin membrane "
            "surrounding the lungs, which can result from prior infection, inflammation, or exposure to "
            "irritants such as asbestos. It typically appears as a thin, dense line along the lung's "
            "outer edge on a chest X-ray, and by itself is often a sign of past injury rather than an "
            "active process."
        ),
    },
    {
        "title": "Diaphragmatic hernia",
        "source": "RadIntel Reference Notes",
        "text": (
            "A diaphragmatic hernia occurs when abdominal contents, most commonly part of the stomach, "
            "push upward through a weakness or opening in the diaphragm into the chest cavity. On a chest "
            "X-ray, this can appear as an unusual air-fluid level or rounded density near the heart "
            "border, and may be an incidental finding or associated with symptoms such as reflux or chest "
            "discomfort depending on its size."
        ),
    },

]