import React, { useState } from 'react';
import {
  List,
  Card,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Tag,
  Empty,
  Pagination,
  Row,
  Col,
  Slider
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined
} from '@ant-design/icons';
import { Question, QuestionGroup } from '../../types';
import QuestionCard from './QuestionCard';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

interface QuestionListProps {
  questions: Question[];
  groups?: QuestionGroup[];
  loading?: boolean;
  showAnswer?: boolean;
  showActions?: boolean;
  editable?: boolean;
  userAnswers?: Record<string, string[]>;
  markedQuestions?: Set<string>;
  pageSize?: number;
  onEdit?: (question: Question) => void;
  onDelete?: (questionId: string) => void;
  onToggleMark?: (questionId: string) => void;
  onAnswerChange?: (questionId: string, answer: string[]) => void;
  className?: string;
  style?: React.CSSProperties;
}

type SortOption = 'default' | 'difficulty-asc' | 'difficulty-desc' | 'created-asc' | 'created-desc';

const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  groups = [],
  loading = false,
  showAnswer = false,
  showActions = false,
  editable = false,
  userAnswers = {},
  markedQuestions = new Set(),
  pageSize = 10,
  onEdit,
  onDelete,
  onToggleMark,
  onAnswerChange,
  className,
  style
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [difficultyRange, setDifficultyRange] = useState<[number, number]>([1, 5]);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Get all unique tags from questions
  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    questions.forEach(q => {
      q.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [questions]);

  // Filter and sort questions
  const filteredQuestions = React.useMemo(() => {
    let filtered = [...questions];

    // Search filter
    if (searchText) {
      const lowercaseSearch = searchText.toLowerCase();
      filtered = filtered.filter(q =>
        q.question.toLowerCase().includes(lowercaseSearch) ||
        q.tags?.some(tag => tag.toLowerCase().includes(lowercaseSearch)) ||
        q.source?.toLowerCase().includes(lowercaseSearch) ||
        q.options?.some(option => option.text.toLowerCase().includes(lowercaseSearch)) ||
        q.explanation?.toLowerCase().includes(lowercaseSearch)
      );
    }

    // Group filter
    if (selectedGroup) {
      const group = groups.find(g => g.id === selectedGroup);
      if (group) {
        filtered = filtered.filter(q => group.questionIds.includes(q.id));
      }
    }

    // Tags filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(q =>
        selectedTags.some(tag => q.tags?.includes(tag))
      );
    }

    // Difficulty filter
    filtered = filtered.filter(q => {
      if (!q.difficulty) return true;
      return q.difficulty >= difficultyRange[0] && q.difficulty <= difficultyRange[1];
    });

    // Sort
    switch (sortBy) {
      case 'difficulty-asc':
        filtered.sort((a, b) => (a.difficulty || 0) - (b.difficulty || 0));
        break;
      case 'difficulty-desc':
        filtered.sort((a, b) => (b.difficulty || 0) - (a.difficulty || 0));
        break;
      case 'created-asc':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'created-desc':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        // Keep original order
        break;
    }

    return filtered;
  }, [questions, searchText, selectedGroup, selectedTags, difficultyRange, sortBy, groups]);

  // Paginate questions
  const paginatedQuestions = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(startIndex, startIndex + pageSize);
  }, [filteredQuestions, currentPage, pageSize]);

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedGroup, selectedTags, difficultyRange, sortBy]);

  const handleResetFilters = () => {
    setSearchText('');
    setSelectedGroup('');
    setSelectedTags([]);
    setDifficultyRange([1, 5]);
    setSortBy('default');
    setCurrentPage(1);
  };

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Text>題目群組：</Text>
              <Select
                style={{ width: '100%', marginTop: 4 }}
                placeholder="選擇群組"
                allowClear
                value={selectedGroup || undefined}
                onChange={(value) => setSelectedGroup(value || '')}
              >
                {groups.map(group => (
                  <Option key={group.id} value={group.id}>
                    {group.name} ({group.questionIds.length})
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={8}>
              <Text>標籤篩選：</Text>
              <Select
                mode="multiple"
                style={{ width: '100%', marginTop: 4 }}
                placeholder="選擇標籤"
                value={selectedTags}
                onChange={setSelectedTags}
                allowClear
              >
                {allTags.map(tag => (
                  <Option key={tag} value={tag}>{tag}</Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={8}>
              <Text>排序方式：</Text>
              <Select
                style={{ width: '100%', marginTop: 4 }}
                value={sortBy}
                onChange={setSortBy}
              >
                <Option value="default">預設順序</Option>
                <Option value="difficulty-asc">
                  <SortAscendingOutlined /> 難度：低到高
                </Option>
                <Option value="difficulty-desc">
                  <SortDescendingOutlined /> 難度：高到低
                </Option>
                <Option value="created-asc">
                  <SortAscendingOutlined /> 建立時間：舊到新
                </Option>
                <Option value="created-desc">
                  <SortDescendingOutlined /> 建立時間：新到舊
                </Option>
              </Select>
            </Col>
          </Row>
          
          <div>
            <Text>難度範圍：</Text>
            <Slider
              range
              min={1}
              max={5}
              value={difficultyRange}
              onChange={(value) => setDifficultyRange(value as [number, number])}
              marks={{
                1: '很簡單',
                2: '簡單',
                3: '中等',
                4: '困難',
                5: '很困難'
              }}
              style={{ marginTop: 8 }}
            />
          </div>
          
          <div>
            <Button onClick={handleResetFilters}>
              重置篩選
            </Button>
          </div>
        </Space>
      </Card>
    );
  };

  const renderHeader = () => (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} lg={18}>
          <Search
            placeholder="搜尋題目、選項、解釋、標籤或來源"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={setSearchText}
            enterButton={<SearchOutlined />}
          />
        </Col>
        <Col xs={24} lg={6}>
          <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              type={showFilters ? "primary" : "default"}
              icon={<FilterOutlined />}
              onClick={() => setShowFilters(!showFilters)}
            >
              篩選 {filteredQuestions.length !== questions.length && `(${filteredQuestions.length})`}
            </Button>
            <Text type="secondary">
              共 {filteredQuestions.length} 題
            </Text>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  const renderPagination = () => {
    if (filteredQuestions.length <= pageSize) return null;

    return (
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Pagination
          current={currentPage}
          total={filteredQuestions.length}
          pageSize={pageSize}
          showSizeChanger
          showQuickJumper
          showTotal={(total, range) => 
            `第 ${range[0]}-${range[1]} 項，共 ${total} 項`
          }
          onChange={(page, size) => {
            setCurrentPage(page);
          }}
          onShowSizeChange={(current, size) => {
            setCurrentPage(1);
          }}
        />
      </div>
    );
  };

  if (questions.length === 0 && !loading) {
    return (
      <div className={className} style={style}>
        <Empty
          description="沒有題目"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      {renderHeader()}
      {renderFilters()}
      
      <List
        loading={loading}
        dataSource={paginatedQuestions}
        renderItem={(question, index) => {
          const globalIndex = (currentPage - 1) * pageSize + index;
          const userAnswer = userAnswers[question.id] || [];
          const isMarked = markedQuestions.has(question.id);
          const correctAnswers = Array.isArray(question.answer) 
            ? question.answer 
            : [question.answer];
          const isCorrect = showAnswer && userAnswer.length > 0 ?
            JSON.stringify(userAnswer.sort()) === JSON.stringify(correctAnswers.sort()) :
            undefined;

          return (
            <List.Item key={question.id} style={{ marginBottom: 16 }}>
              <QuestionCard
                question={question}
                index={globalIndex}
                showAnswer={showAnswer}
                userAnswer={userAnswer}
                isCorrect={isCorrect}
                showActions={showActions}
                marked={isMarked}
                editable={editable}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleMark={onToggleMark}
                onAnswerChange={onAnswerChange}
                style={{ width: '100%' }}
              />
            </List.Item>
          );
        }}
        split={false}
      />

      {renderPagination()}
    </div>
  );
};

export default QuestionList;