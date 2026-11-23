(() => {
  "use strict";
  const { html } = globalThis.MatrixLabRenderer;
  const questions = [
    {
      prompt: "二维点 (x, y) 的标准齐次列向量是什么？",
      options: ["[x, y, 0]ᵀ", "[x, y, 1]ᵀ", "[1, x, y]ᵀ"], answer: 1,
      explanation: "末分量取 1 时，平移矩阵的第三列可以把 tx、ty 加到 x、y 上。",
    },
    {
      prompt: "沿 x 轴平移 2、沿 y 轴平移 −3，数值 2 与 −3 分别放在哪里？",
      options: ["第 1、2 行的第 3 列", "第 3 行的第 1、2 列", "主对角线的前两个位置"], answer: 0,
      explanation: "第三列为 [2, −3, 1]ᵀ。它与输入点的末分量 1 相乘，得到所需的平移量。",
    },
    {
      prompt: "点 (1, 0) 绕原点旋转 +90° 后到达哪里？",
      options: ["(0, −1)", "(−1, 0)", "(0, 1)"], answer: 2,
      explanation: "正角为逆时针。旋转矩阵乘以 [1, 0, 1]ᵀ 后得到 [0, 1, 1]ᵀ。",
    },
    {
      prompt: "对 (2, 3) 使用缩放系数 sx = −2、sy = 0，结果是什么？",
      options: ["(4, 0)", "(−4, 0)", "(−4, 3)"], answer: 1,
      explanation: "缩放后坐标为 (sx·x, sy·y)。零比例让所有顶点的 y 分量变成 0。",
    },
    {
      prompt: "若先执行变换 T 再执行旋转 R，哪个矩阵左乘原始列向量？",
      options: ["T × R", "T + R", "R × T"], answer: 2,
      explanation: "先得 T·p，再得 R·(T·p)。由结合律，总矩阵为 R × T。",
    },
  ];

  function init(form) {
    const score = form.querySelector("#quiz-score");
    const host = form.querySelector("#quiz-questions");
    const responses = questions.map(({ prompt, options }, index) => {
      const card = html("div", undefined, "card question");
      const group = html("fieldset");
      const feedback = html("p", undefined, "feedback");
      feedback.hidden = true;
      group.append(html("legend", (index + 1) + ". " + prompt));
      options.forEach((option, value) => {
        const label = html("label", undefined, "answer-option");
        const input = html("input");
        input.type = "radio";
        input.name = "question-" + index;
        input.value = value;
        label.append(input, html("span", "ABC"[value] + ". " + option));
        group.append(label);
      });
      card.append(group, feedback);
      host.append(card);
      return { card, feedback };
    });

    function clear() {
      score.textContent = "提交后显示得分。";
      for (const { card, feedback } of responses) {
        feedback.hidden = true;
        delete card.dataset.result;
      }
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      let correct = 0;
      questions.forEach(({ answer, options, explanation }, index) => {
        const selection = data.get("question-" + index);
        const match = selection === String(answer);
        if (match) correct++;
        const { card, feedback } = responses[index];
        card.dataset.result = match ? "correct" : "incorrect";
        const status = match ? "回答正确。" : selection === null ? "本题未作答。" : "回答错误。";
        feedback.textContent = status + " 正确答案为 " + "ABC"[answer] + ". " + options[answer] + "。 " + explanation;
        feedback.hidden = false;
      });
      score.textContent = "得分 " + correct + " / " + questions.length;
    });

    form.addEventListener("change", clear);
    form.addEventListener("reset", clear);
    clear();
  }

  globalThis.MatrixLabQuiz = { init };
})();
