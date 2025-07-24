import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Radio, 
  Checkbox,
  Button, 
  Progress, 
  Typography, 
  Space, 
  Tag,
  Divider,
  Modal,
  Row,
  Col,
  theme
} from 'antd';
import { 
  ClockCircleOutlined, 
  StarOutlined, 
  StarFilled,
  LeftOutlined,
  RightOutlined,
  CheckCircleOutlined,
  AppstoreOutlined 
} from '@ant-design/icons';
import { Question, PracticeMode, PracticeSession } from '../../types';
import { usePracticeStore } from '../../stores/practiceStore';
import { useSettingsStore } from '../../stores/settingsStore';
import QuestionNavigationPanel from './QuestionNavigationPanel';
import WrongQuestionToggle from './WrongQuestionToggle';

const { Title, Text } = Typography;
const { confirm } = Modal;

interface PracticeInterfaceProps {
  questions: Question[];
  mode: PracticeMode;
  onFinish: (completedSession?: PracticeSession) => void;
}

const PracticeInterface: React.FC<PracticeInterfaceProps> = ({ 
  questions, 
  mode, 
  onFinish 
}) => {
  const { token } = theme.useToken();
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState<string[]>([]);
  const [showNavigationPanel, setShowNavigationPanel] = useState(false);
  
  const {
    practiceState,
    goToQuestion,
    nextQuestion,
    previousQuestion,
    selectAnswer,
    toggleMarkQuestion,
    startTimer,
    stopTimer,
    endPractice
  } = usePracticeStore();

  const { settings } = useSettingsStore();

  const currentQuestion = questions[practiceState.currentQuestionIndex];
  const isLastQuestion = practiceState.currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = practiceState.currentQuestionIndex === 0;

  // Timer effect
  useEffect(() => {
    let interval: number;
    
    if (practiceState.isTimerRunning) {
      interval = setInterval(() => {
        setTimeElapsed(prev => {
          const newTime = prev + 1;
          
          // Check if timer is enabled and time limit is set
          if (settings.enableTimer && settings.timePerQuestion && settings.timePerQuestion > 0) {
            const timeLimit = settings.timePerQuestion * 60; // Convert minutes to seconds
            
            // If time limit reached, auto-advance to next question
            if (newTime >= timeLimit) {
              if (isLastQuestion) {
                handleFinish();
              } else {
                nextQuestion();
              }
              return 0; // Reset timer for next question
            }
          }
          
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [practiceState.isTimerRunning, settings.enableTimer, settings.timePerQuestion, isLastQuestion]);

  // Initialize practice session when component mounts
  useEffect(() => {
    // Start a new practice session if there isn't one already
    const store = usePracticeStore.getState();
    if (!store.currentSession) {
      store.startPractice(questions, 'manual', mode);
    }
    
    if (mode === 'test') {
      startTimer();
    }
  }, [questions, mode, startTimer]);

  // Load current answer when question changes
  useEffect(() => {
    if (currentQuestion) {
      const savedAnswer = practiceState.userAnswers[currentQuestion.id] || [];
      setCurrentAnswer(savedAnswer);
      
      // Reset timer for new question if timer is enabled
      if (settings.enableTimer && settings.timePerQuestion && settings.timePerQuestion > 0) {
        setTimeElapsed(0);
      }
    }
  }, [currentQuestion?.id, practiceState.userAnswers, settings.enableTimer, settings.timePerQuestion]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (values: string[]) => {
    setCurrentAnswer(values);
    selectAnswer(currentQuestion.id, values);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      handleFinish();
    } else {
      nextQuestion();
    }
  };

  const handleFinish = () => {
    if (mode === 'test') {
      confirm({
        title: '確認提交',
        content: '您確定要提交測驗嗎？提交後將無法修改答案。',
        onOk: () => {
          stopTimer();
          const completedSession = endPractice();
          onFinish(completedSession || undefined);
        }
      });
    } else if (mode === 'wrong-questions') {
      // For wrong questions mode, update review status
      stopTimer();
      const completedSession = endPractice();
      onFinish(completedSession || undefined);
    } else {
      const completedSession = endPractice();
      onFinish(completedSession || undefined);
    }
  };

  const handleMarkQuestion = () => {
    toggleMarkQuestion(currentQuestion.id);
  };

  const getAnswerResult = () => {
    if (mode === 'review' || 
        (mode === 'practice' && settings.showImmediateAnswers && currentAnswer.length > 0) ||
        (mode === 'test' && settings.showImmediateAnswers && currentAnswer.length > 0)) {
      const correctAnswers = currentQuestion.answer;
      const isCorrect = JSON.stringify(currentAnswer.sort()) === JSON.stringify(correctAnswers.sort());
      return { isCorrect, correctAnswers };
    }
    return null;
  };

  const renderQuestionNavigation = () => {
    const answeredCount = Object.keys(practiceState.userAnswers).length;
    const markedCount = practiceState.markedQuestions.size;
    
    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Text>題目 {practiceState.currentQuestionIndex + 1} / {questions.length}</Text>
            </Col>
            <Col>
              <Space>
                <Tag color="blue">已答: {answeredCount}</Tag>
                {settings.allowMarkQuestions && (
                  <Tag color="orange">標記: {markedCount}</Tag>
                )}
                {mode === 'test' && (
                  <Tag 
                    color={
                      settings.enableTimer && settings.timePerQuestion && settings.timePerQuestion > 0
                        ? (timeElapsed >= settings.timePerQuestion * 60 * 0.8 ? 'red' : 'orange')
                        : 'green'
                    } 
                    icon={<ClockCircleOutlined />}
                  >
                    {settings.enableTimer && settings.timePerQuestion && settings.timePerQuestion > 0
                      ? `剩餘 ${formatTime(Math.max(0, settings.timePerQuestion * 60 - timeElapsed))}`
                      : formatTime(timeElapsed)
                    }
                  </Tag>
                )}
                <Button
                  type="default"
                  size="small"
                  icon={<AppstoreOutlined />}
                  onClick={() => setShowNavigationPanel(true)}
                >
                  題目導航
                </Button>
              </Space>
            </Col>
          </Row>
          
          <Progress 
            percent={Math.round(((practiceState.currentQuestionIndex + 1) / questions.length) * 100)}
            strokeColor="#1890ff"
            size="small"
          />
        </Space>
      </Card>
    );
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const answerResult = getAnswerResult();
    
    return (
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>題目 {practiceState.currentQuestionIndex + 1}</span>
            <Space>
              {settings.allowMarkQuestions && (
                <Button
                  type={practiceState.markedQuestions.has(currentQuestion.id) ? "primary" : "default"}
                  icon={practiceState.markedQuestions.has(currentQuestion.id) ? <StarFilled /> : <StarOutlined />}
                  onClick={handleMarkQuestion}
                  size="small"
                >
                  {practiceState.markedQuestions.has(currentQuestion.id) ? '已標記' : '標記'}
                </Button>
              )}
              {mode !== 'wrong-questions' && (
                <WrongQuestionToggle 
                  questionId={currentQuestion.id} 
                  size="small" 
                  showText={false}
                />
              )}
            </Space>
          </div>
        }
        style={{ marginBottom: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={4}>{currentQuestion.question}</Title>
            {currentQuestion.imageUrl && (
              <img 
                src={currentQuestion.imageUrl} 
                alt="Question" 
                style={{ maxWidth: '100%', height: 'auto', marginTop: 16 }}
              />
            )}
          </div>

          <div>
            {/* Check if this is a multiple choice question */}
            {currentQuestion.answer.length > 1 ? (
              <Checkbox.Group
                value={currentAnswer}
                onChange={(values) => handleAnswerChange(values as string[])}
                disabled={mode === 'review'}
              >
                <Space direction="vertical">
                  {currentQuestion.options.map((option: any) => (
                    <Checkbox key={option.id} value={option.id}>
                      <span style={{ 
                        color: answerResult && answerResult.correctAnswers.includes(option.id) ? '#52c41a' : undefined,
                        fontWeight: answerResult && answerResult.correctAnswers.includes(option.id) ? 'bold' : undefined
                      }}>
                        {option.text}
                      </span>
                      {option.imageUrl && (
                        <img 
                          src={option.imageUrl} 
                          alt="Option" 
                          style={{ maxWidth: 200, height: 'auto', marginLeft: 16, display: 'block' }}
                        />
                      )}
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            ) : (
              <Radio.Group
                value={currentAnswer[0]}
                onChange={(e) => handleAnswerChange([e.target.value])}
                disabled={mode === 'review'}
              >
                <Space direction="vertical">
                  {currentQuestion.options.map((option: any) => (
                    <Radio key={option.id} value={option.id}>
                      <span style={{ 
                        color: answerResult && answerResult.correctAnswers.includes(option.id) ? '#52c41a' : undefined,
                        fontWeight: answerResult && answerResult.correctAnswers.includes(option.id) ? 'bold' : undefined
                      }}>
                        {option.text}
                      </span>
                      {option.imageUrl && (
                        <img 
                          src={option.imageUrl} 
                          alt="Option" 
                          style={{ maxWidth: 200, height: 'auto', marginLeft: 16, display: 'block' }}
                        />
                      )}
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            )}
          </div>

          {answerResult && (
            <div>
              <Divider />
              <Space direction="vertical">
                <div>
                  <Tag color={answerResult.isCorrect ? 'success' : 'error'} icon={<CheckCircleOutlined />}>
                    {answerResult.isCorrect ? '正確' : '錯誤'}
                  </Tag>
                  {!answerResult.isCorrect && (
                    <Text type="secondary">
                      正確答案: {answerResult.correctAnswers.join(', ')}
                    </Text>
                  )}
                </div>
                
                {currentQuestion.explanation && (
                  <div>
                    <Text strong>解釋：</Text>
                    <div style={{ 
                      marginTop: 8, 
                      padding: 12, 
                      backgroundColor: token.colorFillQuaternary, 
                      borderRadius: token.borderRadius,
                      border: `1px solid ${token.colorBorder}`,
                      color: token.colorText
                    }}>
                      <Text>{currentQuestion.explanation}</Text>
                    </div>
                  </div>
                )}
              </Space>
            </div>
          )}
        </Space>
      </Card>
    );
  };

  const renderControls = () => (
    <Card>
      <Row justify="space-between" align="middle">
        <Col>
          <Button
            icon={<LeftOutlined />}
            onClick={previousQuestion}
            disabled={isFirstQuestion}
          >
            上一題
          </Button>
        </Col>
        
        <Col>
          <Space>
            {settings.allowSkipQuestions && !isLastQuestion && (
              <Button 
                type="default" 
                onClick={() => {
                  // Skip current question without answering
                  handleNext();
                }}
              >
                跳過
              </Button>
            )}
            {mode === 'test' && (
              <Button type="primary" danger onClick={handleFinish}>
                提交測驗
              </Button>
            )}
            {mode !== 'test' && (
              <Button type="primary" onClick={handleFinish}>
                結束練習
              </Button>
            )}
          </Space>
        </Col>
        
        <Col>
          <Button
            type="primary"
            icon={<RightOutlined />}
            onClick={handleNext}
          >
            {isLastQuestion ? '完成' : '下一題'}
          </Button>
        </Col>
      </Row>
    </Card>
  );

  return (
    <div style={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ 
        flexShrink: 0,
        padding: '16px 24px 0 24px'
      }}>
        {renderQuestionNavigation()}
      </div>
      
      <div style={{ 
        flex: 1,
        overflow: 'auto',
        padding: '0 24px'
      }}>
        {renderQuestion()}
      </div>
      
      <div style={{ 
        flexShrink: 0,
        padding: '16px 24px 24px 24px'
      }}>
        {renderControls()}
      </div>

      {/* Question Navigation Modal */}
      <Modal
        title="題目導航"
        open={showNavigationPanel}
        onCancel={() => setShowNavigationPanel(false)}
        footer={null}
        width={800}
        centered
        destroyOnClose
      >
        <QuestionNavigationPanel
          questions={questions}
          currentQuestionIndex={practiceState.currentQuestionIndex}
          userAnswers={practiceState.userAnswers}
          markedQuestions={practiceState.markedQuestions}
          mode={mode}
          onQuestionSelect={goToQuestion}
          onClose={() => setShowNavigationPanel(false)}
        />
      </Modal>
    </div>
  );
};

export default PracticeInterface;