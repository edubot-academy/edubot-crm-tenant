import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { contactApi, dealsApi, leadsApi, whatsappApi } from '@/api/modules';
import { useToast } from '@/hooks/use-toast';
import type { Contact, Deal, Lead, WhatsAppConversationDetail, WhatsAppConversationSummary, WhatsAppMessageSummary } from '@/types';
import { formatDateTime, formatWhatsAppMessageType } from './whatsapp-utils';

export function UnmatchedWhatsAppQueueCard() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<WhatsAppConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversationSummary | null>(null);
  const [conversationDetail, setConversationDetail] = useState<WhatsAppConversationDetail | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessageSummary[]>([]);
  const [isDialogLoading, setIsDialogLoading] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [linkEntityType, setLinkEntityType] = useState<'contact' | 'lead' | 'deal'>('contact');
  const [linkSearch, setLinkSearch] = useState('');
  const [linkEntityId, setLinkEntityId] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkResults, setLinkResults] = useState<Array<Contact | Lead | Deal>>([]);
  const [isSearchingLinks, setIsSearchingLinks] = useState(false);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setLoadFailed(false);
    const loadUnmatchedConversations = async () => {
      const pageSize = 100;
      let offset = 0;
      let total = 0;
      const collected: WhatsAppConversationSummary[] = [];

      do {
        const response = await whatsappApi.getConversations({
          limit: pageSize,
          offset,
          matched: false,
        });
        collected.push(...response.conversations);
        total = response.pagination.total;
        offset += pageSize;
      } while (offset < total);

      return collected;
    };

    loadUnmatchedConversations()
      .then((items) => {
        if (!isMounted) return;
        setConversations(items.filter((conversation) => conversation.matched_entity.type === 'none'));
      })
      .catch(() => {
        if (!isMounted) return;
        setLoadFailed(true);
        setConversations([]);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedConversation) {
      setConversationDetail(null);
      setMessages([]);
      setLinkEntityType('contact');
      setLinkEntityId('');
      setLinkSearch('');
      setLinkResults([]);
      return;
    }

    let isMounted = true;
    setIsDialogLoading(true);

    Promise.all([
      whatsappApi.getConversation(selectedConversation.id),
      whatsappApi.getConversationMessages(selectedConversation.id, { limit: 20, offset: 0 }),
    ])
      .then(([detail, messagesResponse]) => {
        if (!isMounted) return;
        setConversationDetail(detail);
        setMessages(messagesResponse.messages);
      })
      .catch(() => {
        if (!isMounted) return;
        setConversationDetail(null);
        setMessages([]);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsDialogLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedConversation]);

  useEffect(() => {
    if (!selectedConversation) return;

    let isMounted = true;
    const timeoutId = window.setTimeout(async () => {
      setIsSearchingLinks(true);
      try {
        if (linkEntityType === 'contact') {
          const response = await contactApi.list({ page: 1, limit: 8, search: linkSearch || selectedConversation.customer_info.phone });
          if (!isMounted) return;
          setLinkResults(response.items);
          if (response.items.length > 0 && !linkEntityId) {
            setLinkEntityId(String(response.items[0].id));
          }
        } else if (linkEntityType === 'lead') {
          const response = await leadsApi.list({ page: 1, limit: 8, search: linkSearch || selectedConversation.customer_info.phone });
          if (!isMounted) return;
          setLinkResults(response.items);
          if (response.items.length > 0 && !linkEntityId) {
            setLinkEntityId(String(response.items[0].id));
          }
        } else {
          const response = await dealsApi.list({ page: 1, limit: 8, search: linkSearch || selectedConversation.customer_info.phone });
          if (!isMounted) return;
          setLinkResults(response.items);
          if (response.items.length > 0 && !linkEntityId) {
            setLinkEntityId(String(response.items[0].id));
          }
        }
      } catch {
        if (!isMounted) return;
        setLinkResults([]);
      } finally {
        if (isMounted) {
          setIsSearchingLinks(false);
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [selectedConversation, linkEntityType, linkSearch, linkEntityId]);

  const handleMarkAsRead = async () => {
    if (!selectedConversation) return;
    setIsMarkingRead(true);
    try {
      const response = await whatsappApi.markConversationAsRead(selectedConversation.id);
      toast({ title: response.message });
      setConversations((current) => current.map((conversation) => (
        conversation.id === selectedConversation.id
          ? { ...conversation, unread_count: 0 }
          : conversation
      )));
      setConversationDetail((current) => current ? { ...current, unread_count: 0 } : current);
      setSelectedConversation((current) => current ? { ...current, unread_count: 0 } : current);
    } catch {
      toast({
        title: 'Сүйлөшүүнү окулган деп белгилөө мүмкүн болгон жок',
        variant: 'destructive',
      });
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleLinkConversation = async () => {
    if (!selectedConversation || !linkEntityId.trim()) return;
    setIsLinking(true);
    try {
      const entityId = Number(linkEntityId);
      const payload = linkEntityType === 'contact'
        ? { contactId: entityId }
        : linkEntityType === 'lead'
          ? { leadId: entityId }
          : { dealId: entityId };
      const response = await whatsappApi.linkConversation(selectedConversation.id, payload);
      toast({ title: response.message });
      setConversations((current) => current.filter((conversation) => conversation.id !== selectedConversation.id));
      setSelectedConversation(null);
    } catch {
      toast({
        title: 'Сүйлөшүүнү CRM жазуусуна байланыштыруу мүмкүн болгон жок',
        description: 'ID туура экенин жана бул жазуу учурдагы tenantке тиешелүү экенин текшериңиз.',
        variant: 'destructive',
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleEntityTypeChange = (value: 'contact' | 'lead' | 'deal') => {
    setLinkEntityType(value);
    setLinkEntityId('');
    setLinkResults([]);
  };

  return (
    <>
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Байланышпаган WhatsApp билдирүүлөрү
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Кезек жүктөлүүдө...
            </div>
          ) : loadFailed ? (
            <p className="text-sm text-muted-foreground">
              Байланышпаган билдирүүлөрдү азыр жүктөө мүмкүн болгон жок.
            </p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Учурда кол менен текшерүүнү талап кылган WhatsApp билдирүүсү жок.
            </p>
          ) : (
            conversations.map((conversation) => (
              <div key={conversation.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">WhatsApp</Badge>
                  <Badge variant="outline">CRM жазуусу табылган жок</Badge>
                  {conversation.unread_count > 0 ? (
                    <Badge variant="destructive">{conversation.unread_count} жаңы</Badge>
                  ) : null}
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <p className="font-medium text-foreground">
                    {conversation.customer_info.name || 'Белгисиз жөнөтүүчү'}
                  </p>
                  <p className="text-muted-foreground">{conversation.customer_info.phone}</p>
                  <p className="text-muted-foreground">
                    Бул номер учурда lead, contact же deal менен автоматтык байланышкан жок.
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    Акыркы активдүүлүк: {formatDateTime(conversation.last_message_at || conversation.updated_at)}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setSelectedConversation(conversation)}>
                    Карап чыгуу
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedConversation)} onOpenChange={(open) => {
        if (!open) setSelectedConversation(null);
      }}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Байланышпаган сүйлөшүүнү кароо</DialogTitle>
            <DialogDescription>
              Бул сүйлөшүү CRM жазуусуна автоматтык байланыша алган жок. Азырынча карап чыгуу гана жеткиликтүү.
            </DialogDescription>
          </DialogHeader>
          {isDialogLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Сүйлөшүү жүктөлүүдө...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Unmatched</Badge>
                  {conversationDetail?.unread_count ? (
                    <Badge variant="destructive">{conversationDetail.unread_count} окула элек</Badge>
                  ) : (
                    <Badge variant="outline">Баары окулган</Badge>
                  )}
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <p><span className="text-muted-foreground">Аты:</span> {conversationDetail?.customer_info.name || 'Белгисиз'}</p>
                  <p><span className="text-muted-foreground">Номери:</span> {conversationDetail?.customer_info.phone || selectedConversation?.customer_info.phone}</p>
                  <p><span className="text-muted-foreground">Акыркы активдүүлүк:</span> {formatDateTime(conversationDetail?.last_message_at || selectedConversation?.last_message_at || null)}</p>
                  <p><span className="text-muted-foreground">Себеби:</span> lead/contact/deal табылган жок</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Акыркы билдирүүлөр</p>
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Билдирүү тарыхы табылган жок.</p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="rounded-xl border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={message.direction === 'inbound' ? 'default' : 'outline'}>
                          {message.direction === 'inbound' ? 'Кирген' : 'Чыккан'}
                        </Badge>
                        <Badge variant="outline">{formatWhatsAppMessageType(message.message_type)}</Badge>
                        <Badge variant="outline">{message.status}</Badge>
                      </div>
                      <p className="mt-3 text-sm text-foreground">
                        {message.body || 'Бул билдирүүнүн тексттик мазмуну жок.'}
                      </p>
                      {message.provider_error ? (
                        <p className="mt-2 text-xs text-destructive">{message.provider_error}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDateTime(message.received_at || message.sent_at || message.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleMarkAsRead}
                  disabled={isMarkingRead || !selectedConversation || (conversationDetail?.unread_count ?? selectedConversation.unread_count) === 0}
                >
                  {isMarkingRead ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Окулган деп белгилөө
                </Button>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-sm font-medium text-foreground">Кол менен байланыштыруу</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Сүйлөшүүнү байланыштыруучу CRM жазуусун издеп тандаңыз.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr_auto]">
                  <div className="space-y-2">
                    <Label>Жазуунун түрү</Label>
                    <Select value={linkEntityType} onValueChange={(value) => handleEntityTypeChange(value as 'contact' | 'lead' | 'deal')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contact">Contact</SelectItem>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="deal">Deal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Издөө</Label>
                    <Input
                      value={linkSearch}
                      onChange={(event) => setLinkSearch(event.target.value)}
                      placeholder="Аты же номер боюнча издөө"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleLinkConversation} disabled={isLinking || !linkEntityId.trim()}>
                      {isLinking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Байланыштыруу
                    </Button>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label>Издөө натыйжалары</Label>
                  {isSearchingLinks ? (
                    <div className="flex items-center gap-2 rounded-xl border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      CRM жазуулары изделүүдө...
                    </div>
                  ) : linkResults.length === 0 ? (
                    <div className="rounded-xl border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                      Дал келген CRM жазуулары табылган жок.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {linkResults.map((item) => {
                        const selected = linkEntityId === String(item.id);
                        const label = 'fullName' in item
                          ? item.fullName
                          : `Deal #${item.id}`;
                        const secondary = 'phone' in item
                          ? [item.phone, item.email].filter(Boolean).join(' • ')
                          : [item.contact?.fullName, item.lead?.fullName].filter(Boolean).join(' • ') || 'Келишим жазуусу';

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setLinkEntityId(String(item.id))}
                            className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                              selected
                                ? 'border-primary bg-primary/5'
                                : 'border-border/70 bg-background hover:bg-muted/20'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">{label}</p>
                                <p className="truncate text-xs text-muted-foreground">{secondary || '—'}</p>
                              </div>
                              <Badge variant={selected ? 'default' : 'outline'}>
                                ID {item.id}
                              </Badge>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
