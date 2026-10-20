export type Question = { name: string; label: string; type: 'textarea' | 'select'; options?: string[] };

export const ASSESSMENTS = {
  annotation: {
    position: 'Image Annotation Specialist',
    title: 'Image Annotation Specialist — Application',
    sub: 'Tell us about yourself and complete the annotation assessment below.',
    questions: [
      { name: 'q1', label: '1. Explain what image annotation means and why accuracy matters.', type: 'textarea' },
      { name: 'q2', label: '2. An object is partially hidden in an image. How would you decide whether to annotate it?', type: 'textarea' },
      { name: 'q3', label: '3. If annotation instructions are unclear, what steps would you take?', type: 'textarea' },
      { name: 'q4', label: '4. Two annotators label the same image differently. How would you resolve the difference?', type: 'textarea' },
      { name: 'q5', label: '5. What methods do you use to maintain accuracy during repetitive annotation work?', type: 'textarea' },
      { name: 'q6', label: '6. Which approach best describes correct bounding-box annotation?', type: 'select', options: [
        'Box drawn loosely around the general area of the object',
        'Box drawn tightly to the visible edges of the object, including visible occluded parts',
        'Box drawn only around the most visible 50% of the object',
        'Box skipped if the object is partially hidden',
      ] },
      { name: 'q7', label: "7. You review a labeled image and find an object category is wrong but the box placement is correct. What's the best action?", type: 'select', options: [
        'Leave it as is since the box is correct',
        'Delete the annotation entirely',
        'Correct the category label while keeping the accurate box',
        'Flag the entire image as unusable',
      ] },
    ] as Question[],
  },
  quality: {
    position: 'Image Quality Assessment Specialist',
    title: 'Image Quality Assessment Specialist — Application',
    sub: 'Tell us about yourself and complete the image quality assessment below.',
    questions: [
      { name: 'q1', label: '1. What makes an image high quality?', type: 'textarea' },
      { name: 'q2', label: "2. Compare two images mentally from a recent project you've seen — explain how you'd decide which is better and why.", type: 'textarea' },
      { name: 'q3', label: '3. Rate how important each factor is to you when evaluating images (Realism, Sharpness, Lighting, Composition, Accuracy) — explain your priority order.', type: 'textarea' },
      { name: 'q4', label: '4. Which of these is NOT typically a visual defect to flag in AI-generated images?', type: 'select', options: [
        'Blur or distortion',
        'Incorrect or extra objects',
        'Natural lighting variation across a scene',
        'Unrealistic anatomical or structural details',
      ] },
      { name: 'q5', label: '5. When two images are close in quality, what should guide your final decision?', type: 'select', options: [
        'Personal preference only',
        'Whichever image was generated first',
        'Objective criteria: realism, clarity, composition, and accuracy against the brief',
        'Image file size',
      ] },
      { name: 'q6', label: '6. Explain your reasoning process when selecting the better of two similar images.', type: 'textarea' },
    ] as Question[],
  },
} as const;

export type AssessmentKey = keyof typeof ASSESSMENTS;
export const OPEN_EVENT = 'careers:open';
export type OpenDetail = AssessmentKey | 'talent';
