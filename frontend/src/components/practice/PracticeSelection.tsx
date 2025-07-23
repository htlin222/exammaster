import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Select,
  Radio,
  InputNumber,
  Typography,
  Space,
  Row,
  Col,
  Statistic,
  Alert,
  Tag,
  Divider,
  Checkbox,
  Slider,
  message,
  Modal
} from 'antd';
import {
  PlayCircleOutlined,
  BookOutlined,
  ClockCircleOutlined,
  QuestionCircleOutlined,
  FilterOutlined,
  SettingOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { Question, QuestionGroup, PracticeMode, PracticeSettings } from '../../types';
import { useQuestionStore } from '../../stores/questionStore';
import { usePracticeStore } from '../../stores/practiceStore';
import { GetQuestions, GetQuestionGroups } from '../../../wailsjs/go/main/App';

const { Title, Text } = Typography;
const { Option } = Select;

interface PracticeSelectionProps {
  onStartPractice: (questions: Question[], mode: PracticeMode, settings: PracticeSettings) => void;
}

const PracticeSelection: React.FC<PracticeSelectionProps> = ({ onStartPractice }) => {
  const [loading, setLoading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('practice');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<number[]>([1, 5]);
  const [randomize, setRandomize] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const { questions, groups, setQuestions, setGroups } = useQuestionStore();
  const { startPractice } = usePracticeStore();

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter questions based on selections
  useEffect(() => {
    filterQuestions();
  }, [selectedGroups, selectedTags, difficulty, questions, groups]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [questionsData, groupsData] = await Promise.all([
        GetQuestions(),
        GetQuestionGroups()
      ]);
      
      // Convert Go types to frontend types
      const convertedQuestions = (questionsData || []).map((q: any) => ({
        ...q,
        options: q.options || [],
        answer: q.answer || [],
        tags: q.tags || [],
        createdAt: q.createdAt ? new Date(q.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: q.updatedAt ? new Date(q.updatedAt).toISOString() : new Date().toISOString()
      }));
      
      const convertedGroups = (groupsData || []).map((g: any) => ({
        ...g,
        questionIds: g.questionIds || [],
        createdAt: g.createdAt ? new Date(g.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: g.updatedAt ? new Date(g.updatedAt).toISOString() : new Date().toISOString()
      }));
      
      setQuestions(convertedQuestions);
      setGroups(convertedGroups);
    } catch (error) {
      message.error('Failed to load data: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filterQuestions = () => {
    let filtered = questions;

    // Filter by groups
    if (selectedGroups.length > 0) {
      const selectedGroupQuestionIds = new Set<string>();
      selectedGroups.forEach(groupId => {
        const group = groups.find(g => g.id === groupId);
        if (group) {
          group.questionIds.forEach(qId => selectedGroupQuestionIds.add(qId));
        }
      });
      filtered = filtered.filter(q => selectedGroupQuestionIds.has(q.id));
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(q => 
        q.tags?.some(tag => selectedTags.includes(tag))
      );
    }

    // Filter by difficulty
    filtered = filtered.filter(q => {
      if (!q.difficulty) return true; // Include questions without difficulty
      return q.difficulty >= difficulty[0] && q.difficulty <= difficulty[1];
    });

    setFilteredQuestions(filtered);
    setAvailableQuestions(filtered);
  };

  const getAllTags = () => {
    const tagSet = new Set<string>();
    questions.forEach(q => {
      q.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  };

  const getSelectedQuestions = () => {
    let selected = [...filteredQuestions];
    
    if (randomize) {
      // Shuffle array
      selected = selected.sort(() => Math.random() - 0.5);
    }
    
    // Limit to requested count
    return selected.slice(0, Math.min(questionCount, selected.length));
  };

  const handleStartPractice = () => {
    const selectedQuestions = getSelectedQuestions();
    
    if (selectedQuestions.length === 0) {
      message.error('沒有符合條件的題目，請調整篩選條件');
      return;
    }

    const settings: PracticeSettings = {
      mode: practiceMode,
      questionCount,
      randomize,
      selectedGroups,
      selectedTags,
      difficulty
    };

    // Initialize practice state
    startPractice(selectedQuestions, selectedGroups[0] || 'default', practiceMode);
    
    // Start practice
    onStartPractice(selectedQuestions, practiceMode, settings);
  };

  const getDifficultyText = (value: number) => {
    const levels = ['', '很簡單', '簡單', '中等', '困難', '很困難'];
    return levels[value] || '';
  };

  const getModeDescription = (mode: PracticeMode) => {
    switch (mode) {
      case 'practice':
        return '練習模式：可以立即查看答案和解釋，適合學習';
      case 'test':
        return '測驗模式：完成所有題目後才能查看結果，模擬真實考試';
      case 'review':
        return '複習模式：只顯示之前答錯的題目，加強薄弱環節';
      default:
        return '';
    }
  };

  const renderModeSelection = () => (
    <Card title="練習模式" size="small" style={{ marginBottom: 16 }}>
      <Radio.Group 
        value={practiceMode} 
        onChange={(e) => setPracticeMode(e.target.value)}
        style={{ width: '100%' }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Radio value="practice">
            <Space>
              <BookOutlined />
              <strong>練習模式</strong>
            </Space>
          </Radio>
          <Radio value="test">
            <Space>
              <TrophyOutlined />
              <strong>測驗模式</strong>
            </Space>
          </Radio>
          <Radio value="review">
            <Space>
              <QuestionCircleOutlined />
              <strong>複習模式</strong>
            </Space>
          </Radio>
        </Space>
      </Radio.Group>
      <Alert
        message={getModeDescription(practiceMode)}
        type="info"
        showIcon
        style={{ marginTop: 12 }}
      />
    </Card>
  );

  const renderQuestionSettings = () => (
    <Card title="題目設定" size="small" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Text>題目數量：</Text>
            <InputNumber
              min={1}
              max={Math.max(filteredQuestions.length, 1)}
              value={questionCount}
              onChange={(value) => setQuestionCount(value || 10)}
              style={{ width: '100%', marginTop: 4 }}
            />
          </Col>
          <Col span={12}>
            <Text>可用題目：{filteredQuestions.length} 題</Text>
          </Col>
        </Row>

        <Divider />

        <div>
          <Text>選擇題目群組：</Text>
          <Select
            mode="multiple"
            placeholder="選擇一個或多個群組（不選擇表示使用所有群組）"
            style={{ width: '100%', marginTop: 4 }}
            value={selectedGroups}
            onChange={setSelectedGroups}
            allowClear
          >
            {groups.map(group => (
              <Option key={group.id} value={group.id}>
                {group.name} ({group.questionIds.length} 題)
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <Text>標籤篩選：</Text>
          <Select
            mode="multiple"
            placeholder="選擇標籤進行篩選"
            style={{ width: '100%', marginTop: 4 }}
            value={selectedTags}
            onChange={setSelectedTags}
            allowClear
          >
            {getAllTags().map(tag => (
              <Option key={tag} value={tag}>
                {tag}
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <Text>難度範圍：{getDifficultyText(difficulty[0])} - {getDifficultyText(difficulty[1])}</Text>
          <Slider
            range
            min={1}
            max={5}
            value={difficulty}
            onChange={setDifficulty}
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

        <Checkbox
          checked={randomize}
          onChange={(e) => setRandomize(e.target.checked)}
        >
          隨機排序題目
        </Checkbox>
      </Space>
    </Card>
  );

  const renderStatistics = () => (
    <Card title="統計資訊" size="small" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={8}>
          <Statistic
            title="總題目數"
            value={questions.length}
            prefix={<QuestionCircleOutlined />}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="可用題目"
            value={filteredQuestions.length}
            prefix={<FilterOutlined />}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="將練習"
            value={Math.min(questionCount, filteredQuestions.length)}
            prefix={<PlayCircleOutlined />}
          />
        </Col>
      </Row>
    </Card>
  );

  const renderQuickStart = () => (
    <Card title="快速開始" size="small" style={{ marginBottom: 16 }}>
      <Space wrap>
        <Button
          type="primary"
          onClick={() => {
            setSelectedGroups([]);
            setPracticeMode('practice');
            setQuestionCount(10);
            setDifficulty([1, 5]);
            setSelectedTags([]);
            setRandomize(true);
          }}
        >
          隨機練習 10 題
        </Button>
        <Button
          onClick={() => {
            setSelectedGroups([]);
            setPracticeMode('test');
            setQuestionCount(20);
            setDifficulty([1, 5]);
            setSelectedTags([]);
            setRandomize(true);
          }}
        >
          模擬測驗 20 題
        </Button>
        <Button
          onClick={() => {
            setPracticeMode('review');
            message.info('複習模式需要先完成一些練習記錄');
          }}
        >
          錯題複習
        </Button>
      </Space>
    </Card>
  );

  const renderAdvancedSettings = () => (
    <Modal
      title="進階設定"
      open={settingsModalVisible}
      onCancel={() => setSettingsModalVisible(false)}
      footer={null}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Alert
          message="進階設定"
          description="這些設定將在未來版本中提供更多選項"
          type="info"
          showIcon
        />
        
        <Card size="small" title="時間設定">
          <Checkbox>啟用計時器</Checkbox>
          <br />
          <Checkbox>設定每題時間限制</Checkbox>
        </Card>

        <Card size="small" title="答題設定">
          <Checkbox>允許跳過題目</Checkbox>
          <br />
          <Checkbox>允許標記題目</Checkbox>
          <br />
          <Checkbox>立即顯示正確答案</Checkbox>
        </Card>

        <Card size="small" title="結果設定">
          <Checkbox>儲存練習記錄</Checkbox>
          <br />
          <Checkbox>顯示詳細統計</Checkbox>
        </Card>
      </Space>
    </Modal>
  );

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Title level={3}>載入中...</Title>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="沒有題目"
          description="請先匯入一些題目才能開始練習"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: '16px 24px 0 24px',
        flexShrink: 0
      }}>
        <Title level={2} style={{ margin: '0 0 16px 0' }}>開始練習</Title>
      </div>
      
      <div style={{ 
        flex: 1,
        overflow: 'auto',
        padding: '0 24px 24px 24px'
      }}>
        <Row gutter={16}>
          <Col xs={24} lg={16}>
            {renderQuickStart()}
            {renderModeSelection()}
            {renderQuestionSettings()}
          </Col>
          
          <Col xs={24} lg={8}>
            {renderStatistics()}
            
            <Card style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<PlayCircleOutlined />}
                  onClick={handleStartPractice}
                  disabled={filteredQuestions.length === 0}
                  block
                >
                  開始練習
                </Button>
                
                <Button
                  icon={<SettingOutlined />}
                  onClick={() => setSettingsModalVisible(true)}
                  block
                >
                  進階設定
                </Button>
              </Space>
            </Card>

            {selectedGroups.length > 0 && (
              <Card size="small" title="已選群組" style={{ marginBottom: 16 }}>
                <Space wrap>
                  {selectedGroups.map(groupId => {
                    const group = groups.find(g => g.id === groupId);
                    return group ? (
                      <Tag key={groupId} color="blue">
                        {group.name}
                      </Tag>
                    ) : null;
                  })}
                </Space>
              </Card>
            )}

            {selectedTags.length > 0 && (
              <Card size="small" title="已選標籤" style={{ marginBottom: 16 }}>
                <Space wrap>
                  {selectedTags.map(tag => (
                    <Tag key={tag} color="green">
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </Card>
            )}
          </Col>
        </Row>
      </div>

      {renderAdvancedSettings()}
    </div>
  );
};

export default PracticeSelection;