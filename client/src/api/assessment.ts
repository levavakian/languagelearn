export const createAssessment = async (token: string, courseId: string, title: string) => {
    const lessonPlanContent = `Welcome to your language assessment lesson. I'll be your instructor today, and we'll have a natural conversation to evaluate your language proficiency according to the Common European Framework of Reference for Languages (CEFR).
Throughout our conversation, I'll periodically provide feedback on your performance. Please communicate naturally and don't try to artificially enhance or diminish your language abilities. This will help me accurately assess your CEFR level (A1-C2).
During our chat, I'll observe your vocabulary usage, grammatical accuracy, fluency, and ability to express complex ideas. I will cover different topics, grammar structures, tenses, and vocabulary. At every change in topic or theme, I will provide a preliminary assessment of your CEFR level. At the end of the lesson, I'll provide a detailed summary including your final CEFR level assessment.
Let's begin our conversation! Speak naturally, and I will provide feedback and corrections as you make mistakes.`;
    return fetch(`/api/course/${courseId}/lesson`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            title: title,
            lesson_plan_content: lessonPlanContent,
        })
    });
}