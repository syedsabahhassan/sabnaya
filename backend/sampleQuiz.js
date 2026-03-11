/**
 * Sample Quiz Data
 * Each question has 4 answers, one of which is correct.
 * timeLimit is in seconds.
 */
module.exports = [
  {
    id: 'quiz-general',
    title: 'General Knowledge Challenge',
    description: 'A fun mix of trivia questions across science, history, and pop culture.',
    questions: [
      {
        id: 'q1',
        text: 'What is the capital city of France?',
        answers: [
          { text: 'London', isCorrect: false },
          { text: 'Berlin', isCorrect: false },
          { text: 'Paris', isCorrect: true },
          { text: 'Madrid', isCorrect: false },
        ],
        timeLimit: 20,
        order: 0,
      },
      {
        id: 'q2',
        text: 'How many planets are in our Solar System?',
        answers: [
          { text: '7', isCorrect: false },
          { text: '8', isCorrect: true },
          { text: '9', isCorrect: false },
          { text: '10', isCorrect: false },
        ],
        timeLimit: 15,
        order: 1,
      },
      {
        id: 'q3',
        text: 'What is the chemical symbol for Gold?',
        answers: [
          { text: 'Go', isCorrect: false },
          { text: 'Gd', isCorrect: false },
          { text: 'Gl', isCorrect: false },
          { text: 'Au', isCorrect: true },
        ],
        timeLimit: 20,
        order: 2,
      },
      {
        id: 'q4',
        text: 'Which ocean is the largest on Earth?',
        answers: [
          { text: 'Atlantic Ocean', isCorrect: false },
          { text: 'Indian Ocean', isCorrect: false },
          { text: 'Pacific Ocean', isCorrect: true },
          { text: 'Arctic Ocean', isCorrect: false },
        ],
        timeLimit: 15,
        order: 3,
      },
      {
        id: 'q5',
        text: 'Who painted the Mona Lisa?',
        answers: [
          { text: 'Michelangelo', isCorrect: false },
          { text: 'Leonardo da Vinci', isCorrect: true },
          { text: 'Raphael', isCorrect: false },
          { text: 'Caravaggio', isCorrect: false },
        ],
        timeLimit: 20,
        order: 4,
      },
      {
        id: 'q6',
        text: 'What year did World War II end?',
        answers: [
          { text: '1943', isCorrect: false },
          { text: '1944', isCorrect: false },
          { text: '1945', isCorrect: true },
          { text: '1946', isCorrect: false },
        ],
        timeLimit: 20,
        order: 5,
      },
      {
        id: 'q7',
        text: 'What is the speed of light (approx.) in km/s?',
        answers: [
          { text: '150,000 km/s', isCorrect: false },
          { text: '200,000 km/s', isCorrect: false },
          { text: '300,000 km/s', isCorrect: true },
          { text: '400,000 km/s', isCorrect: false },
        ],
        timeLimit: 25,
        order: 6,
      },
      {
        id: 'q8',
        text: 'Which element has the atomic number 1?',
        answers: [
          { text: 'Helium', isCorrect: false },
          { text: 'Hydrogen', isCorrect: true },
          { text: 'Oxygen', isCorrect: false },
          { text: 'Carbon', isCorrect: false },
        ],
        timeLimit: 15,
        order: 7,
      },
      {
        id: 'q9',
        text: 'How many sides does a hexagon have?',
        answers: [
          { text: '5', isCorrect: false },
          { text: '7', isCorrect: false },
          { text: '8', isCorrect: false },
          { text: '6', isCorrect: true },
        ],
        timeLimit: 10,
        order: 8,
      },
      {
        id: 'q10',
        text: 'What country is home to the kangaroo?',
        answers: [
          { text: 'New Zealand', isCorrect: false },
          { text: 'South Africa', isCorrect: false },
          { text: 'Brazil', isCorrect: false },
          { text: 'Australia', isCorrect: true },
        ],
        timeLimit: 10,
        order: 9,
      },
    ],
  },
  {
    id: 'quiz-science',
    title: 'Science & Technology',
    description: 'Test your knowledge of science and technology.',
    questions: [
      {
        id: 'sq1',
        text: 'What does DNA stand for?',
        answers: [
          { text: 'Deoxyribonucleic Acid', isCorrect: true },
          { text: 'Dynamic Nucleic Acid', isCorrect: false },
          { text: 'Divided Nucleic Array', isCorrect: false },
          { text: 'Dual Nitrogen Acid', isCorrect: false },
        ],
        timeLimit: 20,
        order: 0,
      },
      {
        id: 'sq2',
        text: 'Which programming language was created by Guido van Rossum?',
        answers: [
          { text: 'Java', isCorrect: false },
          { text: 'Ruby', isCorrect: false },
          { text: 'Python', isCorrect: true },
          { text: 'Perl', isCorrect: false },
        ],
        timeLimit: 15,
        order: 1,
      },
      {
        id: 'sq3',
        text: 'What is the powerhouse of the cell?',
        answers: [
          { text: 'Nucleus', isCorrect: false },
          { text: 'Ribosome', isCorrect: false },
          { text: 'Mitochondria', isCorrect: true },
          { text: 'Golgi Apparatus', isCorrect: false },
        ],
        timeLimit: 15,
        order: 2,
      },
    ],
  },
];
