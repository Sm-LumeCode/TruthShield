export async function checkClaimWithGroq(claim: string, apiKey: string): Promise<{ isMisinformation: boolean; explanation: string }> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const systemPrompt = `You are an expert fact-checker and misinformation analyst. Your job is to evaluate whether a claim is factually true or is misinformation/fake news/conspiracy/rumor/unverifiable claim.

Rules:
- If the claim contradicts established scientific consensus, known historical facts, or verifiable reality → it is MISINFORMATION (FALSE)
- If the claim describes something that is factually correct and verifiable → it is TRUE
- If the claim is an opinion, subjective statement, or about future events → lean FALSE (misinformation risk)
- Be decisive. Do not hedge. Output EXACTLY two lines, nothing else.`;

  const userPrompt = `Analyze this claim: "${claim}"

Reply in EXACTLY this format (two lines only):
RESULT: [TRUE or FALSE]
EXPLANATION: [One sentence explaining why, mentioning the key fact that makes it true or false]`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 150
      })
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text: string = data?.choices?.[0]?.message?.content || '';

    const resultMatch = text.match(/RESULT:\s*(TRUE|FALSE)/i);
    const explanationMatch = text.match(/EXPLANATION:\s*(.*)/i);

    const isMisinformation = resultMatch ? resultMatch[1].toUpperCase() === 'FALSE' : false;
    const explanation = explanationMatch ? explanationMatch[1].trim() : 'Analyzed by Groq AI (Llama 3 8B).';

    return { isMisinformation, explanation };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Groq API timeout');
      throw new Error('Fact-check timed out (10s). The API might be overloaded.');
    }
    console.error('Groq API error:', error);
    throw new Error(error.message || 'Failed to verify claim with Groq AI.');
  }
}

