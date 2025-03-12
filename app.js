Array.prototype.pushToBeginning = function (toPush) {
    return this.unshift.apply(this, [toPush]);
}

Array.prototype.first = function () {
    return this[0];
}

iziToast.settings({
    timeout: 1000
});

const {createApp} = Vue;

const LSKEY_LEGACY_TODOLIST = 'tododonfoTodos';
const LSKEY2_SORTINGDIRECTIONINDEX = 'tododonfo2CurrentSortingIndex';
const LSKEY2_THEMEINDEX = 'tododonfo2CurrentTheme';
const LSKEY2_TODOLISTS = 'tododonfo2TodoLists';
const LSKEY2_SHOWFINISHED = 'tododonfo2ShowFinished';
const LSKEY2_CURRENTLISTUUID = 'tododonfo2CurrentListUuid';
const LSKEY2_SHOWPOSTPONED = 'tododonfo2ShowPostponed';

createApp({
    data() {
        return {
            pageLoaded: false,
            todoLists: [
                {

                }
            ],
            currentListName: '',
            currentList: null,
            newTodo: '',
            showFinished: true,
            showPostponed: true,
            currentSortDirectionIndex: 0,
            sortDirections: [
                {
                    name: 'A-Z',
                    icon: 'fa-solid fa-arrow-down-a-z',
                    callback: function (a, b) {
                        if (a.name < b.name) {
                            return -1;
                        }

                        if (a.name > b.name) {
                            return 1;
                        }

                        return 0;
                    }
                },
                {
                    name: 'Z-A',
                    icon: 'fa-solid fa-arrow-down-z-a',
                    callback: function (a, b) {
                        if (a.name > b.name) {
                            return -1;
                        }

                        if (a.name < b.name) {
                            return 1;
                        }

                        return 0;
                    }
                },
                {
                    name: 'newest to oldest',
                    icon: 'fa-solid fa-arrow-up-short-wide',
                    callback: function (a, b) {
                        if (moment(a.created).unix() < moment(b.created).unix()) {
                            return -1;
                        }

                        if (moment(a.created).unix() > moment(b.created).unix()) {
                            return 1;
                        }

                        return 0;
                    }
                },
                {
                    name: 'oldest to newest',
                    icon: 'fa-solid fa-arrow-down-wide-short',
                    callback: function (a, b) {
                        if (moment(a.created).unix() > moment(b.created).unix()) {
                            return -1;
                        }

                        if (moment(a.created).unix() < moment(b.created).unix()) {
                            return 1;
                        }

                        return 0;
                    }
                }
            ],
            currentThemeIndex: 0,
            themes: [
                'lux', 'slate', 'quartz', 'sketchy', 'zephyr'
            ],
            detailViewCanvas: null,
            detailViewTodo: null,
            quote: {}
        }
    },
    created() {
        this.getRandomQuote()
    },
    mounted() {
        this.fetchData();
        this.persistData();

        setTimeout(() => {
            this.pageLoaded = true;

            setTimeout(() => {
                document.getElementById('new-todo-input').addEventListener('keyup', (e) => {
                    if (e.key === 'enter') {
                        console.log(e.ctrlKey);
                        this.addTodo(e.ctrlKey);
                    }
                });

                setInterval(() => {
                    this.persistData();
                }, 10_000);
                this.detailViewCanvas = new bootstrap.Offcanvas(document.getElementById('detailViewCanvas'));
            }, 1_000);

        }, 5000);
    },
    methods: {
        fetchData() {
            this.todoLists = this.getStarterList();
            this.currentList = this.todoLists[0];
            this.currentListName = this.currentList.name;

            // Legacy todolist-support - remove 2025
            if (JSON.parse(localStorage.getItem(LSKEY_LEGACY_TODOLIST))) {
                this.todoLists = [];
                this.addNewList();
                this.todoLists[0].name = 'tododonfo';
                this.currentList = this.todoLists[0];
                this.currentList.todos = JSON.parse(localStorage.getItem(LSKEY_LEGACY_TODOLIST));
                localStorage.removeItem(LSKEY_LEGACY_TODOLIST);
                iziToast.success({
                    title: 'tododonfo has lists now! 📋',
                    timeout: 5000
                })
            } else {
                if (JSON.parse(localStorage.getItem(LSKEY2_TODOLISTS))) {
                    this.todoLists = JSON.parse(localStorage.getItem(LSKEY2_TODOLISTS));
                }

                let savedList = localStorage.getItem(LSKEY2_CURRENTLISTUUID);
                if (savedList && savedList.length > 0) {
                    this.currentList = this.todoLists.find(list => savedList === list.uuid);

                    if (!this.currentList) {
                        this.currentList = this.todoLists[0];
                        localStorage.setItem(LSKEY2_CURRENTLISTUUID, this.currentList.uuid);
                    }
                }
            }

            this.showFinished = JSON.parse(localStorage.getItem(LSKEY2_SHOWFINISHED)) ?? true;
            this.showPostponed = JSON.parse(localStorage.getItem(LSKEY2_SHOWPOSTPONED)) ?? true;
            this.currentThemeIndex = localStorage.getItem(LSKEY2_THEMEINDEX) ?? 0;
            this.currentSortDirectionIndex = localStorage.getItem(LSKEY2_SORTINGDIRECTIONINDEX) ?? 0;
        },
        persistData() {
            localStorage.setItem(LSKEY2_TODOLISTS, JSON.stringify(this.todoLists));
            localStorage.setItem(LSKEY2_SHOWFINISHED, this.showFinished);
            localStorage.setItem(LSKEY2_SHOWPOSTPONED, this.showPostponed);
            localStorage.setItem(LSKEY2_THEMEINDEX, this.currentThemeIndex);
            localStorage.setItem(LSKEY2_SORTINGDIRECTIONINDEX, this.currentSortDirectionIndex);
        },
        addTodo(pushToBeginning = false) {
            if (this.newTodo.trim().length === 0) {
                return false;
            }

            if (this.newTodo.trim().startsWith('!!')) {
                pushToBeginning = true;
                this.newTodo = this.newTodo.replace('!!', '');
            }

            if (this.newTodo.split(';').length >= 2) {
                let newTodos = this.newTodo.split(';').map((task) => {
                    return task.trim();
                })

                newTodos.forEach((todo) => {
                    if (todo.trim().length > 0) {
                        let newTodoData = {
                            uuid: crypto.randomUUID(),
                            body: todo.trim(),
                            done: false,
                            postponed: false,
                            highlighted: false,
                            created_at: moment(),
                            finished_at: null,
                            notes: '',
                        };

                        if (pushToBeginning) {
                            this.currentList.todos.pushToBeginning(newTodoData);
                        } else {
                            this.currentList.todos.push(newTodoData);
                        }

                        iziToast.success({
                            title: 'added todo'
                        });
                    }
                })
            } else {
                let newTodoData = {
                    uuid: crypto.randomUUID(),
                    body: this.newTodo.trim(),
                    done: false,
                    postponed: false,
                    highlighted: false,
                    created_at: moment(),
                    finished_at: null,
                    notes: '',
                };

                if (pushToBeginning) {
                    this.currentList.todos.pushToBeginning(newTodoData);
                } else {
                    this.currentList.todos.push(newTodoData);
                }

                iziToast.success({
                    title: 'added todo'
                });
            }

            this.newTodo = '';
            this.persistData();
        },
        toggleTodo(todo) {
            todo.done = !todo.done;
            todo.highlighted = false;
            todo.finished_at = todo.done ? moment() : null;
            this.persistData();

            if (todo.done) {
                iziToast.success({
                    title: 'todo done! 🎉'
                });
            }
        },
        togglePostponeTodo(todo) {
            todo.postponed = !todo.postponed;
            this.persistData();

            if (todo.postponed) {
                iziToast.info({
                    title: 'postponed todo'
                });
            } else {
                iziToast.success({
                    title: 'reactivated todo'
                });
            }
        },
        toggleHighlighted(todo) {
            todo.highlighted = !(todo.highlighted ?? false);

            if (todo.highlighted) {
                let tempCopyTodo = {};
                tempCopyTodo = Object.assign(tempCopyTodo, todo);
                this.trashTodo(todo.uuid, true);
                this.currentList.todos.pushToBeginning(tempCopyTodo);
            }

            this.persistData();
        },
        trashTodo(uuid, silent = false) {
            let indexToDelete = this.currentList.todos.findIndex(todo => todo.uuid === uuid);

            if (indexToDelete >= 0) {
                this.currentList.todos.splice(indexToDelete, 1);
                this.persistData();

                if (!silent) {
                    iziToast.success({
                        title: 'deleted todo'
                    });
                }
            }
        },
        trashList(uuid, silent = false) {
            if (this.todoLists.length === 1) {
                return false;
            }

            let indexToDelete = this.todoLists.findIndex(todo => todo.uuid === uuid);

            if (indexToDelete >= 0) {
                iziToast.question({
                    close: false,
                    overlay: true,
                    displayMode: 'once',
                    id: 'question',
                    zindex: 99999,
                    title: '',
                    message: 'Do you really want to delete the list "'+this.todoLists[indexToDelete].name+'"?',
                    position: 'center',
                    buttons: [
                        ['<button><b>Yes</b></button>', (instance, toast) => {
                            instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
                            this.todoLists.splice(indexToDelete, 1);
                            this.persistData();

                            if (!silent) {
                                iziToast.success({
                                    title: 'deleted list'
                                });
                            }
                        }, true],
                        ['<button>No</button>', (instance, toast) => {
                            instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
                            iziToast.success({
                                title: 'deletion cancelled'
                            });
                        }],
                    ],
                    onClosing: function(instance, toast, closedBy){},
                    onClosed: function(instance, toast, closedBy){}
                });
            }
        },
        toggleShowFinished() {
            this.showFinished = !this.showFinished;
            this.persistData();
        },
        toggleShowPostponed() {
            this.showPostponed = !this.showPostponed;
            this.persistData();
        },
        selectList(list) {
            this.currentList = list;
            localStorage.setItem(LSKEY2_CURRENTLISTUUID, list.uuid);
        },
        addNewList() {
            this.todoLists.push({
                uuid: crypto.randomUUID(),
                name: 'new list',
                created: moment(),
                todos: [

                ]
            });

            this.persistData();
        },
        getStarterList() {
            return [
                {
                    uuid: crypto.randomUUID(),
                    name: 'tododonfo',
                    created: moment(),
                    todos: [
                        {
                            uuid: crypto.randomUUID(),
                            body: 'My first todo! 🌈',
                            done: false,
                            postponed: false,
                            highlighted: false,
                            created_at: moment(),
                            finished_at: null
                        },
                        {
                            uuid: crypto.randomUUID(),
                            body: 'Discover tododonfo! 🥹🎉',
                            done: true,
                            postponed: false,
                            highlighted: false,
                            created_at: moment(),
                            finished_at: null
                        }
                    ]
                }
            ];
        },
        sortLists() {
            if (this.currentSortDirectionIndex >= (this.sortDirections.length - 1)) {
                this.currentSortDirectionIndex = 0;
            } else {
                this.currentSortDirectionIndex++;
            }

            this.todoLists = this.todoLists.sort(this.currentSorting.callback);
            localStorage.setItem(LSKEY2_SORTINGDIRECTIONINDEX, this.currentSortDirectionIndex);
            this.persistData();

            iziToast.info({
                title: 'List sorted: '+this.currentSorting.name
            })
        },
        cycleTheme() {
            if (this.currentThemeIndex >= (this.themes.length - 1)) {
                this.currentThemeIndex = 0;
            } else {
                this.currentThemeIndex++;
            }

            localStorage.setItem(LSKEY2_THEMEINDEX, this.currentThemeIndex);
            this.persistData();
        },
        clearFinished() {
            let doneTodosForCurrentList = this.currentList.todos.filter((todo) => todo.done === true);

            doneTodosForCurrentList.forEach(todo => {
                this.trashTodo(todo.uuid, true);
            });

            iziToast.success({
                title: 'cleared done todos'
            });
        },
        showInfo(todo) {
            this.detailViewTodo = todo;
            console.debug(todo);

            setTimeout(() => {
                this.detailViewCanvas.show();
            }, 250)
        },
        getFormattedDate(todo) {
            return moment(todo.created_at).format("Y-MM-DD H:m");
        },
        getRandomQuote() {
            axios.get('https://api.quotable.io/random').then(r => this.quote = r.data);
        }
    },
    computed: {
        openTodos() {
            return this.currentList.todos.filter(todo => todo.done === false).filter((todo) => {
                return !todo.postponed;
            });
        },
        finishedTodos() {
            return this.currentList.todos.filter(todo => todo.done === true).filter((todo) => {
                return !todo.postponed;
            });
        },
        postponedTodos() {
            return this.currentList.todos.filter(todo => todo.postponed === true);
        },
        percentFinished() {
            return ((this.finishedTodos.length / this.currentList.todos.filter(todo => !todo.postponed).length) * 100);
        },
        currentSorting() {
            return this.sortDirections[this.currentSortDirectionIndex];
        }
    }
}).mount('#app');
