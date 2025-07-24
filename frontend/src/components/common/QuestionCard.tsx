import React from 'react';
import {
  Card,
  Typography,
  Space,
  Tag,
  Button,
  Radio,
  Checkbox,
  Divider,
  Image,
  theme
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { Question } from '../../types';

const { Text, Paragraph } = Typography;

interface QuestionCardProps {
  question: Question;
  index?: number;
  showAnswer?: boolean;
  userAnswer?: string[];
  isCorrect?: boolean;
  showActions?: boolean;
  marked?: boolean;
  editable?: boolean;
  onEdit?: (question: Question) => void;
  onDelete?: (questionId: string) => void;
  onToggleMark?: (questionId: string) => void;
  onAnswerChange?: (questionId: string, answer: string[]) => void;
  className?: string;
  style?: React.CSSProperties;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  showAnswer = false,
  userAnswer = [],
  isCorrect,
  showActions = false,
  marked = false,
  editable = false,
  onEdit,
  onDelete,
  onToggleMark,
  onAnswerChange,
  className,
  style
}) => {
  const { token } = theme.useToken();
  const correctAnswers = Array.isArray(question.answer) 
    ? question.answer 
    : [question.answer];

  const getDifficultyColor = (difficulty?: number) => {
    if (!difficulty) return 'default';
    if (difficulty <= 2) return 'green';
    if (difficulty <= 3) return 'blue';
    if (difficulty <= 4) return 'orange';
    return 'red';
  };

  const getDifficultyText = (difficulty?: number) => {
    if (!difficulty) return '未設定';
    const levels = ['', '很簡單', '簡單', '中等', '困難', '很困難'];
    return levels[difficulty] || '未知';
  };

  const handleAnswerChange = (optionId: string) => {
    if (!onAnswerChange) return;
    
    // Support both single and multiple selection
    let newAnswer: string[];
    if (userAnswer.includes(optionId)) {
      newAnswer = userAnswer.filter(a => a !== optionId);
    } else {
      // For single selection, replace; for multiple, add
      // This is a simple implementation - you might want to add more logic
      newAnswer = [...userAnswer, optionId];
    }
    
    onAnswerChange(question.id, newAnswer);
  };

  const renderOptions = () => {
    const isMultipleChoice = correctAnswers.length > 1;
    
    return (
      <div>
        {isMultipleChoice ? (
          <Checkbox.Group
            value={userAnswer}
            onChange={(values) => onAnswerChange?.(question.id, values as string[])}
            disabled={showAnswer || !onAnswerChange}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {question.options.map((option: any) => (
                <div key={option.id} style={{ width: '100%' }}>
                  <Checkbox value={option.id}>
                    <span
                      style={{
                        color: showAnswer && correctAnswers.includes(option.id) ? '#52c41a' : undefined,
                        fontWeight: showAnswer && correctAnswers.includes(option.id) ? 'bold' : undefined,
                        textDecoration: showAnswer && userAnswer.includes(option.id) && !correctAnswers.includes(option.id) ? 'line-through' : undefined
                      }}
                    >
                      {option.text}
                    </span>
                  </Checkbox>
                  {option.imageUrl && (
                    <div style={{ marginTop: 8, marginLeft: 24 }}>
                      <Image
                        src={option.imageUrl}
                        alt={`Option ${option.id}`}
                        style={{ maxWidth: 200, maxHeight: 150 }}
                        preview={true}
                      />
                    </div>
                  )}
                </div>
              ))}
            </Space>
          </Checkbox.Group>
        ) : (
          <Radio.Group
            value={userAnswer[0]}
            onChange={(e) => onAnswerChange?.(question.id, [e.target.value])}
            disabled={showAnswer || !onAnswerChange}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {question.options.map((option: any) => (
                <div key={option.id} style={{ width: '100%' }}>
                  <Radio value={option.id}>
                    <span
                      style={{
                        color: showAnswer && correctAnswers.includes(option.id) ? '#52c41a' : undefined,
                        fontWeight: showAnswer && correctAnswers.includes(option.id) ? 'bold' : undefined,
                        textDecoration: showAnswer && userAnswer.includes(option.id) && !correctAnswers.includes(option.id) ? 'line-through' : undefined
                      }}
                    >
                      {option.text}
                    </span>
                  </Radio>
                  {option.imageUrl && (
                    <div style={{ marginTop: 8, marginLeft: 24 }}>
                      <Image
                        src={option.imageUrl}
                        alt={`Option ${option.id}`}
                        style={{ maxWidth: 200, maxHeight: 150 }}
                        preview={true}
                      />
                    </div>
                  )}
                </div>
              ))}
            </Space>
          </Radio.Group>
        )}
      </div>
    );
  };

  const renderAnswerResult = () => {
    if (!showAnswer || userAnswer.length === 0) return null;

    return (
      <div>
        <Divider />
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Tag
              color={isCorrect ? 'success' : 'error'}
              icon={isCorrect ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            >
              {isCorrect ? '正確' : '錯誤'}
            </Tag>
            {!isCorrect && (
              <Text type="secondary" style={{ marginLeft: 8 }}>
                正確答案: {correctAnswers.join(', ')}
              </Text>
            )}
          </div>
          
          {question.explanation && (
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
                <Text>{question.explanation}</Text>
              </div>
            </div>
          )}
        </Space>
      </div>
    );
  };

  const renderActions = () => {
    if (!showActions) return null;

    return (
      <Space>
        {onToggleMark && (
          <Button
            type={marked ? "primary" : "default"}
            size="small"
            icon={marked ? <StarFilled /> : <StarOutlined />}
            onClick={() => onToggleMark(question.id)}
          >
            {marked ? '已標記' : '標記'}
          </Button>
        )}
        {editable && onEdit && (
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(question)}
          >
            編輯
          </Button>
        )}
        {editable && onDelete && (
          <Button
            type="link"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => onDelete(question.id)}
          >
            刪除
          </Button>
        )}
      </Space>
    );
  };

  const cardTitle = (
    <Space>
      {index !== undefined && <span>題目 {index + 1}</span>}
      {question.difficulty && (
        <Tag color={getDifficultyColor(question.difficulty)}>
          {getDifficultyText(question.difficulty)}
        </Tag>
      )}
      {marked && <StarFilled style={{ color: '#faad14' }} />}
    </Space>
  );

  return (
    <Card
      title={cardTitle}
      extra={renderActions()}
      className={className}
      style={{ 
        width: '100%',
        ...style 
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Question Text */}
        <div>
          <Paragraph style={{ fontSize: 16, marginBottom: 16 }}>
            {question.question}
          </Paragraph>
          {question.imageUrl && (
            <div style={{ textAlign: 'center' }}>
              <Image
                src={question.imageUrl}
                alt="Question"
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '300px',
                  height: 'auto'
                }}
                preview={true}
              />
            </div>
          )}
        </div>

        {/* Options */}
        {renderOptions()}

        {/* Answer Result */}
        {renderAnswerResult()}

        {/* Tags and Source */}
        {(question.tags && question.tags.length > 0 || question.source) && (
          <div>
            <Divider />
            <Space wrap>
              {question.tags?.map(tag => (
                <Tag key={tag} color="blue">
                  {tag}
                </Tag>
              ))}
              {question.source && (
                <Tag color="green">
                  來源: {question.source}
                </Tag>
              )}
            </Space>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default QuestionCard;