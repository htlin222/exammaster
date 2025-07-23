import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Tag,
  Select,
  DatePicker,
  Button,
  Typography,
  Space,
  Tabs,
  Alert,
  List,
  Avatar,
  Tooltip,
  Empty,
  message
} from 'antd';
import {
  BarChartOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StarOutlined,
  CalendarOutlined,
  LineChartOutlined,
  PieChartOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PracticeSession, Question, QuestionGroup } from '../../types';
import { useQuestionStore } from '../../stores/questionStore';
import { GetQuestions, GetQuestionGroups, SaveFileToDownloads } from '../../../wailsjs/go/main/App';
import { usePracticeStore } from '../../stores/practiceStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

interface AnalyticsProps {}

interface SessionStats {
  totalSessions: number;
  totalQuestions: number;
  averageAccuracy: number;
  averageDuration: number;
  bestAccuracy: number;
  weakestTopics: string[];
  recentTrend: 'improving' | 'stable' | 'declining';
}

interface QuestionStats {
  questionId: string;
  question: string;
  correctCount: number;
  totalAttempts: number;
  accuracy: number;
  avgDuration: number;
  tags: string[];
}

const Analytics: React.FC<AnalyticsProps> = () => {
  const [loading, setLoading] = useState(false);
  const [filteredSessions, setFilteredSessions] = useState<PracticeSession[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const { questions, groups, setQuestions, setGroups } = useQuestionStore();
  const { sessions, loadSessions } = usePracticeStore();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterSessions();
  }, [sessions, dateRange, selectedGroup]);

  useEffect(() => {
    if (filteredSessions.length > 0) {
      calculateStats();
    }
  }, [filteredSessions, questions]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [questionsData, groupsData] = await Promise.all([
        GetQuestions(),
        GetQuestionGroups(),
        loadSessions() // Load sessions from practice store
      ]);
      
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
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSessions = () => {
    let filtered = [...sessions];

    // Filter by date range
    if (dateRange) {
      const [startDate, endDate] = dateRange;
      filtered = filtered.filter(session => {
        const sessionDate = dayjs(session.createdAt);
        return sessionDate.isAfter(startDate) && sessionDate.isBefore(endDate.add(1, 'day'));
      });
    }

    // Filter by group
    if (selectedGroup) {
      const group = groups.find(g => g.id === selectedGroup);
      if (group) {
        filtered = filtered.filter(session =>
          session.questions.some(q => group.questionIds.includes(q.questionId))
        );
      }
    }

    setFilteredSessions(filtered);
  };

  const calculateStats = () => {
    if (filteredSessions.length === 0) {
      setSessionStats(null);
      setQuestionStats([]);
      return;
    }

    // Calculate session statistics
    const totalQuestions = filteredSessions.reduce((sum, session) => sum + session.totalQuestions, 0);
    const totalCorrect = filteredSessions.reduce((sum, session) => sum + session.correctCount, 0);
    const totalDuration = filteredSessions.reduce((sum, session) => sum + session.duration, 0);
    const accuracies = filteredSessions.map(session => session.accuracy);

    const stats: SessionStats = {
      totalSessions: filteredSessions.length,
      totalQuestions,
      averageAccuracy: totalCorrect / totalQuestions * 100,
      averageDuration: totalDuration / filteredSessions.length,
      bestAccuracy: Math.max(...accuracies),
      weakestTopics: [],
      recentTrend: calculateTrend()
    };

    setSessionStats(stats);

    // Calculate question statistics
    const questionMap = new Map<string, {
      correct: number;
      total: number;
      durations: number[];
      question: Question | undefined;
    }>();

    filteredSessions.forEach(session => {
      session.questions.forEach(q => {
        const existing = questionMap.get(q.questionId) || {
          correct: 0,
          total: 0,
          durations: [],
          question: questions.find(question => question.id === q.questionId)
        };

        existing.total += 1;
        if (q.isCorrect) existing.correct += 1;
        if (q.timeSpent) existing.durations.push(q.timeSpent);

        questionMap.set(q.questionId, existing);
      });
    });

    const questionStatsArray: QuestionStats[] = Array.from(questionMap.entries())
      .map(([questionId, data]) => ({
        questionId,
        question: data.question?.question || 'Unknown Question',
        correctCount: data.correct,
        totalAttempts: data.total,
        accuracy: (data.correct / data.total) * 100,
        avgDuration: data.durations.length > 0 ? 
          data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length : 0,
        tags: data.question?.tags || []
      }))
      .sort((a, b) => a.accuracy - b.accuracy); // Sort by accuracy (worst first)

    setQuestionStats(questionStatsArray);
  };

  const calculateTrend = (): 'improving' | 'stable' | 'declining' => {
    if (filteredSessions.length < 3) return 'stable';

    const recentSessions = filteredSessions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const firstHalf = recentSessions.slice(Math.ceil(recentSessions.length / 2));
    const secondHalf = recentSessions.slice(0, Math.floor(recentSessions.length / 2));

    const firstAvg = firstHalf.reduce((sum, s) => sum + s.accuracy, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.accuracy, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExportReport = async () => {
    try {
      // Prepare comprehensive analytics report data
      const reportData = {
        // Report metadata
        exportInfo: {
          exportDate: new Date().toISOString(),
          dateRange: dateRange ? {
            start: dateRange[0].format('YYYY-MM-DD'),
            end: dateRange[1].format('YYYY-MM-DD')
          } : null,
          selectedGroup: selectedGroup ? groups.find(g => g.id === selectedGroup)?.name : 'All Groups',
          totalSessionsIncluded: filteredSessions.length,
          generatedBy: 'ExamMaster Analytics'
        },

        // Session statistics summary
        sessionStatistics: sessionStats ? {
          totalSessions: sessionStats.totalSessions,
          totalQuestions: sessionStats.totalQuestions,
          averageAccuracy: Number(sessionStats.averageAccuracy.toFixed(2)),
          averageDuration: sessionStats.averageDuration,
          averageDurationFormatted: formatDuration(sessionStats.averageDuration),
          bestAccuracy: Number(sessionStats.bestAccuracy.toFixed(2)),
          recentTrend: sessionStats.recentTrend,
          weakestTopics: sessionStats.weakestTopics
        } : null,

        // Detailed session data
        sessionHistory: filteredSessions.map(session => ({
          id: session.id,
          date: session.createdAt,
          dateFormatted: dayjs(session.createdAt).format('YYYY-MM-DD HH:mm'),
          mode: session.mode,
          totalQuestions: session.totalQuestions,
          correctCount: session.correctCount,
          accuracy: Number(session.accuracy.toFixed(2)),
          duration: session.duration,
          durationFormatted: formatDuration(session.duration),
          markedQuestions: session.questions.filter(q => q.marked).length,
          questionDetails: session.questions.map(q => ({
            questionId: q.questionId,
            isCorrect: q.isCorrect,
            marked: q.marked,
            timeSpent: q.timeSpent,
            timeSpentFormatted: q.timeSpent ? formatDuration(q.timeSpent) : null
          }))
        })),

        // Question analysis data
        questionAnalysis: questionStats.map(stat => ({
          questionId: stat.questionId,
          question: stat.question,
          correctCount: stat.correctCount,
          totalAttempts: stat.totalAttempts,
          accuracy: Number(stat.accuracy.toFixed(2)),
          averageDuration: Number(stat.avgDuration.toFixed(2)),
          averageDurationFormatted: stat.avgDuration > 0 ? formatDuration(Math.round(stat.avgDuration)) : null,
          tags: stat.tags,
          difficultyLevel: stat.accuracy >= 80 ? 'Easy' : stat.accuracy >= 60 ? 'Medium' : 'Hard'
        })),

        // Performance trends
        performanceTrends: {
          trendAnalysis: sessionStats?.recentTrend || 'stable',
          recentSessions: filteredSessions
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10)
            .map(session => ({
              date: dayjs(session.createdAt).format('YYYY-MM-DD'),
              accuracy: Number(session.accuracy.toFixed(2)),
              duration: session.duration,
              questionsAnswered: session.totalQuestions
            }))
        },

        // Group analysis (if specific group selected)
        groupAnalysis: selectedGroup && groups.length > 0 ? {
          groupName: groups.find(g => g.id === selectedGroup)?.name,
          groupId: selectedGroup,
          questionsInGroup: groups.find(g => g.id === selectedGroup)?.questionIds.length || 0,
          sessionsInGroup: filteredSessions.length
        } : null
      };

      // Generate filename with timestamp and group info
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const groupSuffix = selectedGroup ? `-${groups.find(g => g.id === selectedGroup)?.name || 'group'}` : '-all';
      const dateRangeSuffix = dateRange ? `-${dateRange[0].format('YYYY-MM-DD')}_to_${dateRange[1].format('YYYY-MM-DD')}` : '';
      const filename = `exammaster-analytics-report${groupSuffix}${dateRangeSuffix}-${timestamp}.json`;

      // Save file using backend
      const dataStr = JSON.stringify(reportData, null, 2);
      const filePath = await SaveFileToDownloads(filename, dataStr);

      // Show success message with file info
      const fileSize = Math.round(dataStr.length / 1024);
      message.success(
        <div>
          <div>成功匯出分析報告</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            檔案: {filename} ({fileSize}KB)
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            位置: {filePath}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            資料: {filteredSessions.length} 筆練習記錄
          </div>
        </div>,
        8 // Show for 8 seconds to allow reading the path
      );
    } catch (error) {
      console.error('Export failed:', error);
      message.error('匯出失敗: ' + (error as Error).message);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return { icon: '📈', color: '#52c41a', text: '進步中' };
      case 'declining': return { icon: '📉', color: '#ff4d4f', text: '需加強' };
      default: return { icon: '📊', color: '#1890ff', text: '穩定' };
    }
  };

  const renderOverview = () => {
    if (!sessionStats) {
      return (
        <Empty
          description="尚無練習記錄"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    const trendInfo = getTrendIcon(sessionStats.recentTrend);

    return (
      <div style={{ width: '100%' }}>
        {/* Key Metrics */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="總練習次數"
                value={sessionStats.totalSessions}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#1890ff', fontSize: '20px' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="累計題目數"
                value={sessionStats.totalQuestions}
                prefix={<QuestionCircleOutlined />}
                valueStyle={{ color: '#722ed1', fontSize: '20px' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="平均正確率"
                value={sessionStats.averageAccuracy}
                precision={1}
                suffix="%"
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#52c41a', fontSize: '20px' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="平均用時"
                value={formatDuration(sessionStats.averageDuration)}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#fa8c16', fontSize: '20px' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Performance Overview */}
        <Row gutter={[12, 12]}>
          <Col xs={24} lg={12}>
            <Card title="學習表現" size="small">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div>
                  <Text>最佳正確率</Text>
                  <Progress
                    percent={sessionStats.bestAccuracy}
                    strokeColor="#52c41a"
                    size="small"
                    format={percent => `${percent?.toFixed(1)}%`}
                  />
                </div>
                <div>
                  <Text>平均正確率</Text>
                  <Progress
                    percent={sessionStats.averageAccuracy}
                    strokeColor="#1890ff"
                    size="small"
                    format={percent => `${percent?.toFixed(1)}%`}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text>學習趨勢：</Text>
                  <Tag color={trendInfo.color}>
                    {trendInfo.icon} {trendInfo.text}
                  </Tag>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="近期表現" size="small">
              {filteredSessions.length > 0 ? (
                <List
                  dataSource={filteredSessions.slice(0, 5)}
                  size="small"
                  split={false}
                  renderItem={(session, index) => (
                    <List.Item style={{ padding: '6px 0', border: 'none' }}>
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            size="small"
                            style={{ 
                              backgroundColor: session.accuracy >= 80 ? '#52c41a' : 
                                             session.accuracy >= 60 ? '#faad14' : '#ff4d4f' 
                            }}
                          >
                            {index + 1}
                          </Avatar>
                        }
                        title={
                          <Text style={{ fontSize: '13px' }}>
                            {`${session.accuracy.toFixed(1)}% (${session.correctCount}/${session.totalQuestions})`}
                          </Text>
                        }
                        description={
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {`${dayjs(session.createdAt).format('MM-DD HH:mm')} • ${formatDuration(session.duration)}`}
                          </Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="尚無練習記錄" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  const renderQuestionAnalysis = () => {
    const columns: ColumnsType<QuestionStats> = [
      {
        title: '題目',
        dataIndex: 'question',
        key: 'question',
        ellipsis: true,
        width: '40%',
        render: (text: string) => (
          <Tooltip title={text}>
            <Text ellipsis>{text}</Text>
          </Tooltip>
        )
      },
      {
        title: '正確率',
        dataIndex: 'accuracy',
        key: 'accuracy',
        width: '15%',
        render: (accuracy: number) => (
          <Progress
            percent={accuracy}
            size="small"
            strokeColor={accuracy >= 80 ? '#52c41a' : accuracy >= 60 ? '#faad14' : '#ff4d4f'}
            format={percent => `${percent?.toFixed(1)}%`}
          />
        ),
        sorter: (a, b) => a.accuracy - b.accuracy
      },
      {
        title: '答對/總數',
        key: 'attempts',
        width: '12%',
        render: (_, record) => `${record.correctCount}/${record.totalAttempts}`
      },
      {
        title: '平均用時',
        dataIndex: 'avgDuration',
        key: 'avgDuration',
        width: '10%',
        render: (duration: number) => duration > 0 ? formatDuration(Math.round(duration)) : '-'
      },
      {
        title: '標籤',
        dataIndex: 'tags',
        key: 'tags',
        width: '23%',
        render: (tags: string[]) => (
          <Space wrap>
            {tags?.slice(0, 3).map(tag => (
              <Tag key={tag} color="blue">{tag}</Tag>
            ))}
            {tags?.length > 3 && <Tag>+{tags.length - 3}</Tag>}
          </Space>
        )
      }
    ];

    return (
      <Card title="題目分析" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table
            columns={columns}
            dataSource={questionStats}
            rowKey="questionId"
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 項，共 ${total} 項`
            }}
            size="small"
            scroll={{ x: 1000 }}
          />
        </div>
      </Card>
    );
  };

  const renderSessionHistory = () => {
    const columns: ColumnsType<PracticeSession> = [
      {
        title: '日期時間',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: '20%',
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
        sorter: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      },
      {
        title: '模式',
        dataIndex: 'mode',
        key: 'mode',
        width: '10%',
        render: (mode: string) => {
          const modeMap = {
            practice: { text: '練習', color: 'blue' },
            test: { text: '測驗', color: 'green' },
            review: { text: '複習', color: 'orange' }
          };
          const modeInfo = modeMap[mode as keyof typeof modeMap] || { text: mode, color: 'default' };
          return <Tag color={modeInfo.color}>{modeInfo.text}</Tag>;
        }
      },
      {
        title: '題目數',
        dataIndex: 'totalQuestions',
        key: 'totalQuestions',
        width: '10%'
      },
      {
        title: '正確率',
        dataIndex: 'accuracy',
        key: 'accuracy',
        width: '15%',
        render: (accuracy: number) => (
          <Tag color={accuracy >= 80 ? 'success' : accuracy >= 60 ? 'warning' : 'error'}>
            {accuracy.toFixed(1)}%
          </Tag>
        ),
        sorter: (a, b) => a.accuracy - b.accuracy
      },
      {
        title: '答對/答錯',
        key: 'correctWrong',
        width: '15%',
        render: (_, record) => (
          <Space>
            <Tag color="success" icon={<CheckCircleOutlined />}>
              {record.correctCount}
            </Tag>
            <Tag color="error" icon={<CloseCircleOutlined />}>
              {record.totalQuestions - record.correctCount}
            </Tag>
          </Space>
        )
      },
      {
        title: '用時',
        dataIndex: 'duration',
        key: 'duration',
        width: '10%',
        render: (duration: number) => formatDuration(duration)
      },
      {
        title: '標記題數',
        key: 'marked',
        width: '10%',
        render: (_, record) => {
          const markedCount = record.questions.filter(q => q.marked).length;
          return markedCount > 0 ? (
            <Tag color="orange" icon={<StarOutlined />}>
              {markedCount}
            </Tag>
          ) : '-';
        }
      }
    ];

    return (
      <Card title="練習記錄" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table
            columns={columns}
            dataSource={filteredSessions}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 項，共 ${total} 項`
            }}
            size="small"
            scroll={{ x: 1200 }}
          />
        </div>
      </Card>
    );
  };

  const renderFilters = () => (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Row gutter={16} align="middle">
        <Col flex="300px">
          <Text>時間範圍：</Text>
          <RangePicker
            style={{ width: '100%', marginTop: 4 }}
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            format="YYYY-MM-DD"
          />
        </Col>
        <Col flex="200px">
          <Text>題目群組：</Text>
          <Select
            placeholder="選擇群組"
            allowClear
            style={{ width: '100%', marginTop: 4 }}
            value={selectedGroup || undefined}
            onChange={(value) => setSelectedGroup(value || '')}
          >
            {groups.map(group => (
              <Option key={group.id} value={group.id}>
                {group.name}
              </Option>
            ))}
          </Select>
        </Col>
        <Col flex="auto" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportReport}
              style={{ marginTop: 4 }}
              disabled={filteredSessions.length === 0}
            >
              匯出報告
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  if (sessions.length === 0 && !loading) {
    return (
      <div style={{ padding: 24 }}>
        <Title level={2}>統計分析</Title>
        <Alert
          message="尚無練習記錄"
          description="開始練習後就能在這裡查看詳細的統計分析報告"
          type="info"
          showIcon
          style={{ marginTop: 16 }}
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
        <Title level={2} style={{ margin: '0 0 16px 0' }}>統計分析</Title>
        {renderFilters()}
      </div>
      
      <div style={{ 
        flex: 1,
        overflow: 'hidden',
        padding: '0 16px'
      }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          style={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}
          tabBarStyle={{ flexShrink: 0, marginBottom: 0 }}
        >
          <TabPane 
            tab={
              <span>
                <BarChartOutlined />
                總覽
              </span>
            } 
            key="overview"
            style={{ 
              height: '100%',
              overflow: 'auto',
              padding: '16px 8px 24px 8px'
            }}
          >
            {renderOverview()}
          </TabPane>
          <TabPane 
            tab={
              <span>
                <PieChartOutlined />
                題目分析
              </span>
            } 
            key="questions"
            style={{ 
              height: '100%',
              overflow: 'auto'
            }}
          >
            {renderQuestionAnalysis()}
          </TabPane>
          <TabPane 
            tab={
              <span>
                <LineChartOutlined />
                練習記錄
              </span>
            } 
            key="history"
            style={{ 
              height: '100%',
              overflow: 'auto'
            }}
          >
            {renderSessionHistory()}
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;