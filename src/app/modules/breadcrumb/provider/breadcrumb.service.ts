import { Injectable } from '@angular/core';
import { ActivatedRoute, Event, NavigationEnd, Router, ActivatedRouteSnapshot } from '@angular/router';
import { filter, distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';
import { IBreadCrumb } from '@breadcrumb/api/breadcrumb.interface';

@Injectable()
export class BreadcrumbService {

    private router: Router;

    private routerEvents$: Subject<boolean>;

    private route: ActivatedRoute;

    private isListenRouterEvents: boolean;

    private subs: number;

    private breadcrumb$: Subject<IBreadCrumb[]>;

    constructor(
        router: Router,
        route: ActivatedRoute
    ) {
        this.router = router;
        this.route  = route;
        this.subs   = 0;

        this.breadcrumb$ = new Subject<IBreadCrumb[]>();
        this.routerEvents$ = new Subject<boolean>();
    }

    public get breadcrumbs(): Observable<Array<IBreadCrumb>> {

        const observable: Observable<Array<IBreadCrumb>> = Observable.create( (observer) => {

            if ( ! this.isListenRouterEvents ) {
                this.registerRouterEvents();
                this.isListenRouterEvents = true;
            }

            const sub = this.breadcrumb$.subscribe(observer);
            this.subs++;

            return () => {
                sub.unsubscribe();
                this.subs--;

                if ( this.subs <= 0 ) {
                    this.routerEvents$.next(false);
                    this.isListenRouterEvents = false;
                }
            };
        });
        return observable;
    }

    private registerRouterEvents() {

        this.router.events
            .pipe(
                takeUntil(this.routerEvents$),
                filter( (event: Event) => {
                    return event instanceof NavigationEnd;
                }),
                distinctUntilChanged(),
                map( ( event: Event ) => {
                    return this.createBreadcrumbs(this.route.root, '', 'Home');
                })
            )
            .subscribe( (breadcrumbs: Array<IBreadCrumb>) => {
                this.breadcrumb$.next(breadcrumbs);
            });
    }

    private createBreadcrumbs(route: ActivatedRoute, url = '', name = ''): Array<IBreadCrumb> {

        const breadCrumbs: Array<IBreadCrumb> = [];

        const routeConfig = route.routeConfig || {};
        const path  = routeConfig.path || '';
        const label = routeConfig.data && routeConfig.data['breadcrumb'] || name;
        const nextUrl = `${url}/${path}`;

        if ( label.length ) {
            breadCrumbs.push({path, label});
        }

        if (route.firstChild) {
            breadCrumbs.push( ...this.createBreadcrumbs(route.firstChild, nextUrl));
        }

        return breadCrumbs;
    }
}