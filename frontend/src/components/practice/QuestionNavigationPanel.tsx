import React from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Grid,
  Badge,
  Tooltip,
  Divider
} from 'antd';
import { 
  CheckCircleOutlined, 
  StarFilled,
  ClockCircleOutlined,
  BookOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { Question, PracticeMode } from '../../types';

const { Text } = Typography;

interface QuestionNavigationPanelProps {
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: Record<string, string[]>;
  markedQuestions: Set<string>;
  mode: PracticeMode;
  onQuestionSelect: (index: number) => void;
  onClose: () => void;
}

const QuestionNavigationPanel: React.FC<QuestionNavigationPanelProps> = ({
  questions,
  currentQuestionIndex,
  userAnswers,
  markedQuestions,
  mode,
  onQuestionSelect,
  onClose
}) => {
  const getQuestionStatus = (question: Question, index: number) => {
    const isAnswered = userAnswers[question.id]?.length > 0;
    const isMarked = markedQuestions.has(question.id);
    const isCurrent = index === currentQuestionIndex;

    if (isCurrent) {
      return { 
        type: 'primary' as const, 
        icon: <EyeOutlined />, 
        tooltip: '當前題目',
        className: 'current-question'
      };
    }
    
    if (isAnswered && isMarked) {
      return { 
        type: 'default' as const, 
        icon: <StarFilled style={{ color: '#faad14' }} />, 
        tooltip: '已答且已標記',
        className: 'answered-marked'
      };
    }
    
    if (isAnswered) {
      return { 
        type: 'default' as const, 
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />, 
        tooltip: '已作答',
        className: 'answered'
      };
    }
    
    if (isMarked) {
      return { 
        type: 'default' as const, 
        icon: <StarFilled style={{ color: '#faad14' }} />, 
        tooltip: '已標記',
        className: 'marked'
      };
    }
    
    return { 
      type: 'default' as const, 
      icon: null, 
      tooltip: '未作答',
      className: 'unanswered'
    };
  };

  const renderQuestionGrid = () => {
    const questionsPerRow = 10;
    const rows = Math.ceil(questions.length / questionsPerRow);
    
    return Array.from({ length: rows }).map((_, rowIndex) => {
      const startIndex = rowIndex * questionsPerRow;
      const endIndex = Math.min(startIndex + questionsPerRow, questions.length);
      const rowQuestions = questions.slice(startIndex, endIndex);
      
      return (
        <div key={rowIndex} style={{ marginBottom: 12 }}>
          <Space wrap size="small">
            {rowQuestions.map((question, colIndex) => {
              const questionIndex = startIndex + colIndex;
              const status = getQuestionStatus(question, questionIndex);
              
              return (
                <Tooltip key={question.id} title={`題目 ${questionIndex + 1}: ${status.tooltip}`}>
                  <Badge dot={status.icon !== null} color={status.type === 'primary' ? '#1890ff' : undefined}>
                    <Button
                      type={status.type}
                      size="small"
                      onClick={() => {
                        onQuestionSelect(questionIndex);
                        onClose();
                      }}
                      style={{
                        width: 36,
                        height: 36,
                        fontWeight: status.type === 'primary' ? 'bold' : 'normal',
                        border: status.type === 'primary' ? '2px solid #1890ff' : undefined
                      }}
                      className={status.className}
                    >
                      {questionIndex + 1}
                    </Button>
                  </Badge>
                </Tooltip>
              );
            })}
          </Space>
        </div>
      );
    });
  };

  const getStatistics = () => {
    const totalQuestions = questions.length;
    const answeredCount = questions.filter(q => userAnswers[q.id]?.length > 0).length;
    const markedCount = markedQuestions.size;
    const unansweredCount = totalQuestions - answeredCount;
    
    return { totalQuestions, answeredCount, markedCount, unansweredCount };
  };

  const stats = getStatistics();

  return (
    <Card
      title={
        <Space>
          <BookOutlined />
          <span>題目導航</span>
          <Text type="secondary">({stats.answeredCount}/{stats.totalQuestions})</Text>
        </Space>
      }
      extra={
        <Button type="text" onClick={onClose}>
          關閉
        </Button>
      }
      style={{ 
        maxWidth: '90vw',
        maxHeight: '80vh',
        overflow: 'auto'
      }}
      bodyStyle={{ padding: '16px 20px' }}
    >
      {/* Statistics Summary */}
      <div style={{ marginBottom: 16 }}>
        <Space size="large">
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <Text>已答: {stats.answeredCount}</Text>
          </Space>
          <Space>
            <StarFilled style={{ color: '#faad14' }} />
            <Text>標記: {stats.markedCount}</Text>
          </Space>
          <Space>
            <ClockCircleOutlined style={{ color: '#ff4d4f' }} />
            <Text>未答: {stats.unansweredCount}</Text>
          </Space>
          <Space>
            <EyeOutlined style={{ color: '#1890ff' }} />
            <Text>當前: 第 {currentQuestionIndex + 1} 題</Text>
          </Space>
        </Space>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Legend */}
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          圖例：
        </Text>
        <div style={{ marginTop: 8 }}>
          <Space wrap size="middle">
            <Space size="small">
              <Button type="primary" size="small" style={{ width: 24, height: 24, fontSize: 10 }}>1</Button>
              <Text style={{ fontSize: 12 }}>當前</Text>
            </Space>
            <Space size="small">
              <Badge dot color="#52c41a">
                <Button size="small" style={{ width: 24, height: 24, fontSize: 10 }}>1</Button>
              </Badge>
              <Text style={{ fontSize: 12 }}>已答</Text>
            </Space>
            <Space size="small">
              <Badge dot color="#faad14">
                <Button size="small" style={{ width: 24, height: 24, fontSize: 10 }}>1</Button>
              </Badge>
              <Text style={{ fontSize: 12 }}>標記</Text>
            </Space>
            <Space size="small">
              <Button size="small" style={{ width: 24, height: 24, fontSize: 10 }}>1</Button>
              <Text style={{ fontSize: 12 }}>未答</Text>
            </Space>
          </Space>
        </div>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Question Grid */}
      <div style={{ textAlign: 'center' }}>
        {renderQuestionGrid()}
      </div>

      {/* Quick Actions */}
      <Divider style={{ margin: '16px 0 12px 0' }} />
      <div style={{ textAlign: 'center' }}>
        <Space>
          <Button 
            size="small" 
            onClick={() => {
              // Go to first unanswered question
              const firstUnanswered = questions.findIndex(q => !userAnswers[q.id]?.length);
              if (firstUnanswered !== -1) {
                onQuestionSelect(firstUnanswered);
                onClose();
              }
            }}
            disabled={stats.unansweredCount === 0}
          >
            跳至第一題未答
          </Button>
          <Button 
            size="small" 
            onClick={() => {
              // Go to first marked question
              const firstMarked = questions.findIndex(q => markedQuestions.has(q.id));
              if (firstMarked !== -1) {
                onQuestionSelect(firstMarked);
                onClose();
              }
            }}
            disabled={stats.markedCount === 0}
          >
            跳至第一題標記
          </Button>
        </Space>
      </div>
    </Card>
  );
};

export default QuestionNavigationPanel;