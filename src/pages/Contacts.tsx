import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageShell';
import { DataTable, type Column } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ky } from '@/lib/i18n';
import { contactApi } from '@/api/modules';
import { formatDate } from '@/lib/formatting';
import type { Contact } from '@/types';
import { Plus, Trash2, Loader2, Mail, Phone, IdCard, GraduationCap, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyError } from '@/lib/error-messages';
import { useRolePermissions } from '@/hooks/use-role-permissions';
import { useIsMobile } from '@/hooks/use-mobile';

const emptyForm = { fullName: '', phone: '', email: '', notes: '' };

export default function ContactsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { canViewLmsTechnicalFields } = useRolePermissions();
  const getSearchParam = (key: string, fallback = '') => searchParams.get(key) ?? fallback;
  const getPageParam = () => {
    const value = Number(searchParams.get('page'));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
  };
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(() => getSearchParam('q'));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(() => getPageParam());
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const shouldOpenCreate = searchParams.get('create') === '1';

  const clearCreateParam = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('create');
      return next;
    }, { replace: true });
  };

  const resetCreateForm = () => {
    setForm(emptyForm);
    clearCreateParam();
    setShowCreate(false);
  };

  const fetchContacts = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    contactApi.list({ search, page, limit: 20 })
      .then((res) => {
        setContacts(res.items);
        setTotalItems(res.total || 0);
        setTotalPages(Math.max(res.totalPages || 1, 1));
      })
      .catch(() => {
        setContacts([]);
        setTotalItems(0);
        setTotalPages(1);
        setLoadError('Интернет байланышын текшерип, кайра аракет кылыңыз');
        toast({
          title: 'Тизмени жүктөө мүмкүн болгон жок',
          description: 'Интернет байланышын текшерип, кайра аракет кылыңыз',
          variant: 'destructive',
        });
      })
      .finally(() => setIsLoading(false));
  }, [page, search, toast]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const nextSearch = searchParams.get('q') ?? '';
    const nextPage = getPageParam();

    if (nextSearch !== search) setSearch(nextSearch);
    if (nextPage !== page) setPage(nextPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);

      if (search) next.set('q', search);
      else next.delete('q');

      if (page > 1) next.set('page', String(page));
      else next.delete('page');

      return next.toString() === current.toString() ? current : next;
    }, { replace: true });
  }, [search, page, setSearchParams]);

  useEffect(() => {
    if (shouldOpenCreate) {
      setShowCreate(true);
    }
  }, [shouldOpenCreate]);

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCreate = async () => {
    if (!form.fullName || !form.phone) return;
    setIsCreating(true);
    try {
      await contactApi.create({ fullName: form.fullName, phone: form.phone, email: form.email || undefined, notes: form.notes || undefined });
      toast({ title: 'Байланыш ийгиликтүү кошулду' });
      setShowCreate(false);
      setForm(emptyForm);
      clearCreateParam();
      fetchContacts();
    } catch (error) {
      const friendly = getFriendlyError(error, { fallbackTitle: 'Байланышты сактоо ишке ашкан жок' });
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await contactApi.delete(deleteTarget.id);
      toast({ title: ky.contacts.deleteSuccess });
      setDeleteTarget(null);
      fetchContacts();
    } catch (error) {
      const friendly = getFriendlyError(error, { fallbackTitle: ky.contacts.deleteError });
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Contact>[] = [
    { key: 'fullName', header: ky.common.name, render: (c) => <span className="font-medium">{c.fullName}</span> },
    { key: 'phone', header: ky.common.phone },
    { key: 'email', header: ky.common.email, className: 'hidden md:table-cell' },
    { key: 'notes', header: ky.common.notes, render: (c) => <span className="text-sm text-muted-foreground truncate max-w-[200px] block">{c.notes || '—'}</span>, className: 'hidden lg:table-cell' },
    {
      key: 'actions', header: '', render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/contacts/${c.id}`);
            }}
            aria-label={`${c.fullName} маалыматын ачуу`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(c);
            }}
            aria-label={`${c.fullName} өчүрүү`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  ];

  const renderMobileCard = (contact: Contact) => (
    <Card className="border-border/60 shadow-card">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{contact.fullName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(contact.createdAt)}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(contact); }} aria-label={`${ky.common.delete} ${contact.fullName}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <a href={`tel:${contact.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-primary hover:underline"><Phone className="h-3.5 w-3.5" /><span>{contact.phone}</span></a>
          {contact.email && <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 hover:text-foreground"><Mail className="h-3.5 w-3.5" /><span className="truncate">{contact.email}</span></a>}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/contacts/${contact.id}`);
          }}
          aria-label={`${contact.fullName} маалыматын ачуу`}
        >
          Карточканы ачуу
        </Button>
        {contact.notes && <p className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground line-clamp-3">{contact.notes}</p>}
      </CardContent>
    </Card>
  );
  const activeFilters = search.trim()
    ? [{
      key: 'search',
      label: `Издөө: ${search.trim()}`,
      onRemove: () => updateSearch(''),
    }]
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={ky.contacts.title}
        description="Байланыштарды ылдам таап, карточкасынын ичинен кийинки аракетке өтүңүз."
        actions={<Button onClick={() => {
          clearCreateParam();
          setShowCreate(true);
        }}><Plus className="mr-2 h-4 w-4" />{ky.contacts.newContact}</Button>}
      />
      <div className="hidden rounded-2xl border border-border/60 bg-card p-4 shadow-card md:block">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_auto] lg:items-end">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Издөө</Label>
            <Input value={search} onChange={(e) => updateSearch(e.target.value)} placeholder="Байланыш издөө..." className="h-10" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="h-8 rounded-full px-3">{totalItems} байланыш</Badge>
          </div>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={contacts}
        isLoading={isLoading}
        errorMessage={loadError || undefined}
        onRetry={fetchContacts}
        searchValue={isMobile ? search : undefined}
        onSearchChange={isMobile ? updateSearch : undefined}
        searchPlaceholder="Байланыш издөө..."
        activeFilters={isMobile ? activeFilters : undefined}
        totalItems={totalItems}
        totalItemsLabel="байланыш"
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        stickyHeader
        onRowClick={(c) => navigate(`/contacts/${c.id}`)}
        renderMobileCard={renderMobileCard}
      />

      <Dialog open={showCreate} onOpenChange={(open) => {
        setShowCreate(open);
        if (!open) resetCreateForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ky.contacts.newContact}</DialogTitle>
            <DialogDescription>Алгач негизги байланыш маалыматын сактаңыз. Калган контекстти кийин карточканын ичинен толуктай аласыз.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="mb-4">
                <p className="text-sm font-semibold text-foreground">Негизги маалымат</p>
                <p className="text-xs text-muted-foreground">Аты жана телефону талап кылынат.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{ky.common.name} *</Label>
                  <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder={ky.common.fullNamePlaceholder} />
                </div>
                <div className="space-y-2">
                  <Label>{ky.common.phone} *</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+996 ..." />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{ky.common.email}</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder={ky.common.emailPlaceholder} />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 p-4">
              <div className="mb-4">
                <p className="text-sm font-semibold text-foreground">Кошумча контекст</p>
                <p className="text-xs text-muted-foreground">Менеджер үчүн маанилүү болгон эскертүүнү кошуңуз.</p>
              </div>
              <div className="space-y-2">
                <Label>{ky.common.notes}</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={ky.common.notesPlaceholder} />
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-border/60 pt-4">
            <Button variant="outline" onClick={resetCreateForm}>{ky.common.cancel}</Button>
            <Button onClick={handleCreate} disabled={isCreating || !form.fullName || !form.phone}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {ky.common.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ky.contacts.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{ky.contacts.deleteConfirmDesc} Бул аракетти кайтаруу мүмкүн эмес.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t border-border/60 pt-4">
            <AlertDialogCancel disabled={isDeleting}>{ky.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {ky.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
